import type { AccountRole } from '../authentication/types';
import { canAccessOwner, getAccountAvatar } from '../authentication/types';
import { authenticationService, requireCurrentAccount } from '../authentication/service';

export type OwnerRecordView = `users` | `feedback`;
export type OwnerAccountRecord = {
  id: string;
  email: string;
  number: number;
  active: boolean;
  role: AccountRole;
  displayName: string;
  avatarUrl: string | null;
  authProviders: string[] | null;
};
export type OwnerRecordsSnapshot = {
  message: string;
  nextCursor: number | null;
  records: OwnerAccountRecord[] | null;
  source: `supabase` | null;
  authProvidersState: `ready` | `unavailable` | null;
  realtime: `connecting` | `subscribed` | `unavailable`;
  state: `loading` | `ready` | `error` | `denied` | `unavailable`;
};

export const ownerDirectoryPageSize = 50;
const roles = new Set<AccountRole>([`Owner`, `Admin`, `Member`, `Developer`, `Subscriber`]);
let subscriptionNumber = 0;

const blankSnapshot = (state: OwnerRecordsSnapshot[`state`], message: string): OwnerRecordsSnapshot => ({
  state,
  message,
  source: null,
  records: null,
  nextCursor: null,
  authProvidersState: null,
  realtime: `unavailable`,
});

const readDirectoryRecord = (value: unknown, profileValue: unknown): OwnerAccountRecord => {
  const row = value as Record<string, unknown> | null;
  const profile = profileValue as Record<string, unknown> | null;
  if (
    !row || !profile || typeof row.id !== `string` ||
    !Number.isSafeInteger(row.number) || Number(row.number) < 1 ||
    !row.id.startsWith(`User_${row.number}_Account_`) || profile.account_id !== row.id ||
    typeof row.email !== `string` || !row.email || row.email.length > 320 ||
    typeof row.active !== `boolean` || !roles.has(row.role as AccountRole) ||
    typeof profile.display_name !== `string` || !profile.display_name.trim() || profile.display_name.length > 80
  ) throw new Error(`Unsupported account directory record.`);
  return {
    id: row.id,
    email: row.email,
    active: row.active,
    number: Number(row.number),
    role: row.role as AccountRole,
    authProviders: null,
    displayName: profile.display_name,
    avatarUrl: getAccountAvatar({ avatarUrl: typeof profile.avatar_url === `string` ? profile.avatar_url : null }),
  };
};

const readSignInMethods = (value: unknown, accountIds: string[]): Map<string, string[]> | null => {
  if (!Array.isArray(value) || value.length !== accountIds.length) return null;
  const expectedIds = new Set(accountIds);
  const methods = new Map<string, string[]>();
  for (const item of value) {
    const row = item as Record<string, unknown> | null;
    if (!row || typeof row.account_id !== `string` || !expectedIds.has(row.account_id) || methods.has(row.account_id) || !Array.isArray(row.providers)) return null;
    const providers = row.providers as unknown[];
    if (providers.some((provider) => typeof provider !== `string` || !/^[a-z][a-z0-9:_-]{0,63}$/.test(provider)) || new Set(providers).size !== providers.length) return null;
    methods.set(row.account_id, providers as string[]);
  }
  return methods;
};

export const ownerRecordsService = {
  subscribe: (
    view: OwnerRecordView,
    receive: (snapshot: OwnerRecordsSnapshot) => void,
    options: { before?: number | null } = {},
  ): (() => void) => {
    if (view === `feedback`) {
      receive(blankSnapshot(`unavailable`, `Feedback intake and review are not connected. No messages have been loaded.`));
      return () => {};
    }
    const before = options.before ?? null;
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) {
      receive(blankSnapshot(`error`, `This account page is invalid. Return to the newest page.`));
      return () => {};
    }
    let disposed = false;
    let generation = 0;
    let scope: string | null = null;
    let removeChannel = () => {};
    const clearScope = () => {
      generation += 1;
      scope = null;
      removeChannel();
      removeChannel = () => {};
    };
    const unsubscribeAuth = authenticationService.subscribe((snapshot) => {
      if (disposed) return;
      if (snapshot.status !== `signed-in` || !canAccessOwner(snapshot.account)) {
        clearScope();
        receive(blankSnapshot(
          snapshot.status === `loading` ? `loading` : snapshot.status === `unavailable` ? `unavailable` : `denied`,
          snapshot.status === `loading` ? `Waiting for a confirmed Owner account.` : `Only an active, verified Owner can load the private account directory.`,
        ));
        return;
      }
      let access: ReturnType<typeof requireCurrentAccount>;
      try { access = requireCurrentAccount(); } catch {
        clearScope();
        receive(blankSnapshot(`denied`, `Your account access changed. Refresh your sign-in before loading records.`));
        return;
      }
      const { client, account, revision } = access;
      const nextScope = `${account.id}:${account.authUid}:${revision}`;
      if (scope === nextScope) return;
      clearScope();
      scope = nextScope;
      const current = generation;
      let running = false;
      let queued = false;
      let failed = false;
      let request: AbortController | null = null;
      let realtime: OwnerRecordsSnapshot[`realtime`] = `connecting`;
      const isCurrent = () => !disposed && generation === current && !failed;
      const assertCurrent = () => {
        if (!isCurrent() || !canAccessOwner(requireCurrentAccount(account, revision).account)) throw new Error(`Owner access changed.`);
      };
      const fail = (state: `error` | `denied`, message: string) => {
        if (!isCurrent()) return;
        failed = true;
        removeChannel();
        receive(blankSnapshot(state, message));
      };
      const verifyOwner = async (signal: AbortSignal) => {
        assertCurrent();
        const result = await client.from(`accounts`).select(`id,role,active`).eq(`id`, account.id).abortSignal(signal).single();
        assertCurrent();
        if (result.error || result.data?.role !== `Owner` || result.data?.active !== true) {
          fail(`denied`, `Owner access could not be confirmed. No private account records are shown.`);
          throw new Error(`Owner access unavailable.`);
        }
      };
      const load = async () => {
        if (!isCurrent()) return;
        if (running) { queued = true; return; }
        running = true;
        const queriedRealtime = realtime;
        const controller = new AbortController();
        request = controller;
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          await verifyOwner(controller.signal);
          let query = client.from(`accounts`).select(`id,email,number,role,active`).order(`number`, { ascending: false }).limit(ownerDirectoryPageSize + 1).abortSignal(controller.signal);
          if (before !== null) query = query.lt(`number`, before);
          const result = await query;
          assertCurrent();
          if (result.error || !result.data) throw new Error(`Directory read failed.`);
          const rows = result.data.slice(0, ownerDirectoryPageSize);
          const profiles = rows.length ? await client.from(`profiles`).select(`account_id,display_name,avatar_url`).in(`account_id`, rows.map((row) => row.id)).limit(ownerDirectoryPageSize).abortSignal(controller.signal) : { data: [], error: null };
          assertCurrent();
          if (profiles.error || !profiles.data) throw new Error(`Profile read failed.`);
          const profileMap = new Map<string, unknown>(profiles.data.map((profile) => [profile.account_id, profile] as [string, unknown]));
          const records = rows.map((row) => readDirectoryRecord(row, profileMap.get(row.id)));
          let signInMethods: Map<string, string[]> | null = records.length ? null : new Map();
          if (records.length) {
            try {
              const methods = await client.rpc(`get_account_sign_in_methods`, {
                p_account_ids: records.map((record) => record.id),
                p_expected_auth_uid: account.authUid,
              }).abortSignal(controller.signal);
              assertCurrent();
              if (!methods.error) signInMethods = readSignInMethods(methods.data, records.map((record) => record.id));
            } catch { assertCurrent(); }
          }
          records.forEach((record) => { record.authProviders = signInMethods?.get(record.id) ?? null; });
          await verifyOwner(controller.signal);
          assertCurrent();
          const latest: OwnerRecordsSnapshot = {
            records,
            realtime: queriedRealtime,
            state: `ready`,
            source: `supabase`,
            authProvidersState: signInMethods ? `ready` : `unavailable`,
            nextCursor: result.data.length > ownerDirectoryPageSize ? records[records.length - 1]?.number ?? null : null,
            message: `${records.length} account(s) loaded from Supabase. This page contains at most ${ownerDirectoryPageSize} accounts; it is not a global total.${signInMethods ? `` : ` Sign-in methods are unavailable.`}`,
          };
          receive(latest);
        } catch {
          fail(`error`, `The private account directory could not be loaded. Retry to reconnect; no previous records are shown.`);
        } finally {
          clearTimeout(timeout);
          if (request === controller) request = null;
          running = false;
          if (queued && isCurrent()) { queued = false; void load(); }
        }
      };
      receive({ ...blankSnapshot(`loading`, `Loading the private account directory.`), realtime });
      // Change events invalidate a bounded server query; event payloads never become displayed records.
      try {
        const channel = client.channel(`owner-directory-${++subscriptionNumber}`)
          .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `accounts` }, () => { void load(); })
          .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `accounts` }, () => { void load(); })
          .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `profiles` }, () => { void load(); })
          .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `profiles` }, () => { void load(); });
        removeChannel = () => { request?.abort(); void client.removeChannel(channel); };
        channel.subscribe((status) => {
          if (!isCurrent()) return;
          if (status === `SUBSCRIBED`) {
            realtime = `subscribed`;
            void load();
          } else if (status === `CHANNEL_ERROR` || status === `TIMED_OUT` || status === `CLOSED`) {
            fail(`error`, `The account update subscription stopped. Retry to reload confirmed records and reconnect.`);
          }
        });
        void load();
      } catch {
        fail(`error`, `The account update subscription could not start. Retry to reconnect.`);
      }
    });
    return () => {
      disposed = true;
      clearScope();
      unsubscribeAuth();
    };
  },
};
