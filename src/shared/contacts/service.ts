import { AppState } from 'react-native';
import { getSupabaseClient } from '../supabase/client';
import { getErrorCode } from '../supabase/errors';
import { supabaseConfigured } from '../supabase/config';
import { canAccessOwner } from '../authentication/types';
import { authenticationService, requireCurrentAccount } from '../authentication/service';
import type { ContactInput, ContactRecord, ContactReceipt, ContactSnapshot, ContactStatus } from './types';
import { contactPageSize, contactRequestIdPattern, normalizeContactInput, readContact, readContactReceipt, validateContactInput } from './values';

type ContactListener = (snapshot: ContactSnapshot) => void;
const refreshers = new Set<() => Promise<void>>();
let subscriptionNumber = 0;

const failure = (error: unknown): Pick<ContactSnapshot, `state` | `message`> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { state: `unavailable`, message: `Contact Needs Supabase Configuration` };
  if ([`PGRST202`, `PGRST205`, `42P01`, `42883`].includes(code)) return { state: `unavailable`, message: `The Contact Database Setup Is Not Available Yet` };
  if ([`42501`, `PGRST301`, `app/identity-changed`, `app/contact-denied`].includes(code)) return { state: `denied`, message: `The Contact Action Is Not Permitted For The Current Account` };
  if (code === `40001`) return { state: `error`, message: `This Contact Changed. Reload Before Trying Again` };
  if ([`22023`, `23514`, `23502`, `22P02`].includes(code)) return { state: `error`, message: `Check The Contact Fields And Retry With The Same Unchanged Submission` };
  if (code === `P0001` && (error as { message?: string })?.message === `Contact Rate Limit Reached`) return { state: `error`, message: `Too Many Contact Requests For This Email. Wait 10 Minutes Before Sending Again` };
  return { state: `error`, message: error instanceof Error && !code ? error.message : `The Contact Request Was Not Confirmed. Keep Your Draft And Retry` };
};

const blankSnapshot = (state: ContactSnapshot[`state`], message: string): ContactSnapshot => ({ state, message, records: null, nextCursor: null, realtime: `unavailable` });
const requireOwner = (expected?: Parameters<typeof requireCurrentAccount>[0], revision?: number): ReturnType<typeof requireCurrentAccount> => {
  const scope = requireCurrentAccount(expected, revision);
  if (!canAccessOwner(scope.account)) throw Object.assign(new Error(`Only The Active Verified Owner Can Review Contacts`), { code: `app/contact-denied` });
  return scope;
};

const boundedRequest = async <T>(request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try { return await request(controller.signal); }
  catch (error) {
    if (controller.signal.aborted) throw new Error(`The Contact Request Was Not Confirmed. Keep Your Draft And Retry`);
    throw error;
  } finally { clearTimeout(timeout); }
};

const submit = async (input: ContactInput, requestId: string): Promise<ContactReceipt> => {
  try {
    const errors = validateContactInput(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0] ?? `Check The Contact Fields`);
    if (!contactRequestIdPattern.test(requestId)) throw new Error(`Start A Valid Contact Submission Attempt`);
    const identity = authenticationService.getSnapshot().identity?.authUid ?? null;
    const client = getSupabaseClient();
    const { data, error } = await boundedRequest((signal) => client.rpc(`submit_contact`, {
      p_request_id: requestId,
      p_expected_auth_uid: identity,
      p_payload: normalizeContactInput(input),
    }).abortSignal(signal));
    if (identity !== (authenticationService.getSnapshot().identity?.authUid ?? null)) throw Object.assign(new Error(`The Account Changed During This Submission`), { code: `app/identity-changed` });
    if (error) throw error;
    return readContactReceipt(data);
  } catch (error) { throw Object.assign(new Error(failure(error).message), { code: getErrorCode(error) }); }
};

const subscribeManager = (receive: ContactListener, options: { before?: number | null } = {}): (() => void) => {
  const before = options.before ?? null;
  if (before !== null && (!Number.isSafeInteger(before) || before < 1)) {
    receive(blankSnapshot(`error`, `Return To The Newest Contacts Page`));
    return () => {};
  }
  let disposed = false;
  let generation = 0;
  let scopeKey: string | null = null;
  let stopCurrent: (() => void) | null = null;
  const emit = (snapshot: ContactSnapshot): void => { if (!disposed) receive(snapshot); };
  const stop = (): void => { generation += 1; stopCurrent?.(); stopCurrent = null; scopeKey = null; };
  const unsubscribeAuth = authenticationService.subscribe((auth) => {
    if (disposed) return;
    if (auth.status !== `signed-in` || !canAccessOwner(auth.account)) {
      stop();
      emit(blankSnapshot(auth.status === `loading` ? `loading` : auth.status === `unavailable` ? `unavailable` : `denied`, auth.status === `loading` ? `Confirming Owner Access` : `Only The Active Verified Owner Can Review Contacts`));
      return;
    }
    try {
      const scope = requireOwner(auth.account ?? undefined);
      const nextKey = `${scope.account.id}:${scope.account.authUid}:${scope.revision}`;
      if (scopeKey === nextKey) return;
      stop();
      scopeKey = nextKey;
      const activeGeneration = generation;
      let dirty = false;
      let pending: Promise<void> | null = null;
      let controller: AbortController | null = null;
      let realtime: ContactSnapshot[`realtime`] = `connecting`;
      const isCurrent = (): boolean => {
        if (disposed || generation !== activeGeneration) return false;
        try { requireOwner(scope.account, scope.revision); return true; } catch { return false; }
      };
      const refresh = (): Promise<void> => {
        if (!isCurrent()) return Promise.resolve();
        dirty = true;
        if (pending) return pending;
        const operation = (async () => {
          while (dirty && isCurrent()) {
            dirty = false;
            const request = new AbortController();
            controller = request;
            const timeout = setTimeout(() => request.abort(), 12_000);
            try {
              const { data, error } = await scope.client.rpc(`get_owner_contacts`, { p_before: before, p_expected_auth_uid: scope.account.authUid }).abortSignal(request.signal);
              if (!isCurrent()) return;
              if (error) throw error;
              if (!Array.isArray(data) || data.length > contactPageSize + 1) throw new Error(`The Contact List Has An Unsupported Format`);
              const rows = data.map(readContact);
              if (rows.some((row, index) => (before !== null && row.number >= before) || (index > 0 && row.number >= (rows[index - 1]?.number ?? 0)))) throw new Error(`The Contact Page Has An Unsupported Order`);
              if (dirty) continue;
              const records = rows.slice(0, contactPageSize);
              emit({ state: `ready`, records, realtime, nextCursor: rows.length > contactPageSize ? records.at(-1)?.number ?? null : null, message: `${records.length} Contact(s) Loaded From Supabase. This Page Contains At Most ${contactPageSize} Contacts; It Is Not A Global Total` });
            } catch (error) {
              if (!isCurrent()) return;
              const result = failure(error);
              emit({ ...blankSnapshot(result.state, result.message), realtime });
              dirty = false;
            } finally {
              clearTimeout(timeout);
              if (controller === request) controller = null;
            }
          }
        })();
        pending = operation;
        void operation.finally(() => {
          if (pending !== operation) return;
          pending = null;
          if (dirty && isCurrent()) void refresh();
        });
        return operation;
      };
      const channel = scope.client.channel(`owner-contacts:${++subscriptionNumber}`)
        .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `contacts` }, () => { void refresh(); })
        .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `contacts` }, () => { void refresh(); });
      const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) void refresh(); });
      refreshers.add(refresh);
      stopCurrent = () => { controller?.abort(); foreground.remove(); refreshers.delete(refresh); void scope.client.removeChannel(channel); };
      emit({ ...blankSnapshot(`loading`, `Loading Private Contacts`), realtime });
      channel.subscribe((status) => {
        if (!isCurrent()) return;
        realtime = status === `SUBSCRIBED` ? `subscribed` : `unavailable`;
        void refresh();
      });
      void refresh();
    } catch (error) {
      stop();
      const result = failure(error);
      emit(blankSnapshot(result.state, result.message));
    }
  });
  return () => { disposed = true; stop(); unsubscribeAuth(); };
};

const setStatus = async (record: ContactRecord, status: ContactStatus): Promise<ContactRecord> => {
  try {
    if (![`new`, `read`, `archived`].includes(status)) throw new Error(`Choose A Supported Contact Status`);
    const scope = requireOwner();
    const { data, error } = await boundedRequest((signal) => scope.client.rpc(`set_contact_status`, {
      p_id: record.id,
      p_status: status,
      p_expected_auth_uid: scope.account.authUid,
      p_expected_updated_at: record.updatedAt,
    }).abortSignal(signal));
    requireOwner(scope.account, scope.revision);
    if (error) throw error;
    const saved = readContact(Array.isArray(data) ? data[0] : null);
    if (saved.id !== record.id || saved.number !== record.number || saved.status !== status || saved.createdAt !== record.createdAt ||
      saved.name !== record.name || saved.email !== record.email || saved.subject !== record.subject || saved.message !== record.message) throw new Error(`The Contact Status Save Could Not Be Confirmed`);
    await Promise.all([...refreshers].map((refresh) => refresh()));
    requireOwner(scope.account, scope.revision);
    return saved;
  } catch (error) { throw Object.assign(new Error(failure(error).message), { code: getErrorCode(error) }); }
};

export const contactsService = { submit, setStatus, subscribeManager, configured: supabaseConfigured };
