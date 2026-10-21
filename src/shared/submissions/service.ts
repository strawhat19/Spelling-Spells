import { useLocalStorage } from '../config';
import { randomUUID } from 'expo-crypto';
import { getErrorCode } from '../supabase/errors';
import { supabaseConfigured } from '../supabase/config';
import { canAccessOwner } from '../authentication/types';
import { requireCurrentAccount } from '../authentication/service';
import { readStoredPreference, writeStoredPreference, queueStorageOperation } from '../common/storage';
import type { SubmissionDraft, SubmissionErrors, SubmissionRecord, SubmissionService, SubmissionPageResult } from './types';

const draftKey = `spelling-spells:submission-draft:v1`;
type StoredSubmissionDraft = Omit<SubmissionDraft, `mediaUrl`> & { mediaUrl?: string };
export const submissionUnavailable = `The Submission Database Setup Is Not Available Yet. Your Draft Has Not Been Sent`;
export const draftLimits = { name: 120, world: 120, pronunciation: 240, definition: 1400, sourceUrl: 1000, mediaUrl: 1000, notes: 2000 } as const;
export const emptyDraft = (): SubmissionDraft => ({
  version: 1,
  kind: `new-spell`,
  name: ``,
  world: ``,
  pronunciation: ``,
  definition: ``,
  sourceUrl: ``,
  mediaUrl: ``,
  notes: ``,
});

const isDraft = (value: unknown): value is StoredSubmissionDraft => {
  if (!value || typeof value !== `object` || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && (record.kind === `new-spell` || record.kind === `correction`)
    && Object.entries(draftLimits).every(([field, length]) => (field === `mediaUrl` && record[field] === undefined) || (typeof record[field] === `string` && (record[field] as string).length <= length));
};

export const validSourceUrl = (input: string): boolean => {
  try {
    const url = new URL(input);
    return url.protocol === `https:` && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
};

export const validateDraft = (draft: SubmissionDraft): SubmissionErrors => {
  const errors: SubmissionErrors = {};
  if (!draft.name.trim()) errors.name = `Add the exact spell name`;
  if (!draft.world.trim()) errors.world = `Add its story, game, or world`;
  if (!draft.definition.trim()) errors.definition = `Describe what the spell does in its story`;
  if (!validSourceUrl(draft.sourceUrl.trim())) errors.sourceUrl = `Add a complete HTTPS source link without embedded credentials`;
  if (draft.mediaUrl.trim() && !validSourceUrl(draft.mediaUrl.trim())) errors.mediaUrl = `Add a complete public HTTPS image or media link without embedded credentials`;
  for (const [field, limit] of Object.entries(draftLimits)) {
    if (draft[field as keyof typeof draftLimits].length > limit) errors[field as keyof typeof draftLimits] = `Keep this under ${limit} characters`;
  }
  return errors;
};

type DraftSnapshot = { value: SubmissionDraft; error: string | null; persisted: boolean; dirty: boolean };
let draftState: DraftSnapshot | null = null;
let draftRevision = 0;
let draftLoading: Promise<DraftSnapshot> | null = null;
const cloneDraft = (snapshot: DraftSnapshot): DraftSnapshot => ({ ...snapshot, value: { ...snapshot.value } });

const loadDraft = async (): Promise<DraftSnapshot> => {
  if (draftState) return cloneDraft(draftState);
  if (!draftLoading) {
    draftLoading = readStoredPreference<StoredSubmissionDraft>(draftKey, `Contribution draft`, isDraft, emptyDraft()).then((result) => {
      draftState = { ...result, value: { ...result.value, mediaUrl: result.value.mediaUrl ?? `` }, dirty: false };
      return cloneDraft(draftState);
    }).finally(() => { draftLoading = null; });
  }
  return cloneDraft(await draftLoading);
};

export const draftService = {
  load: loadDraft,
  // A transient draft survives internal navigation without silently writing to disk.
  stage: (draft: SubmissionDraft) => {
    draftRevision += 1;
    draftState = { value: { ...draft }, error: null, persisted: false, dirty: true };
  },
  save: (draft: SubmissionDraft) => {
    if (!isDraft(draft) || typeof draft.mediaUrl !== `string`) return Promise.reject(new Error(`This Draft Has an Unsupported Format`));
    const revision = ++draftRevision;
    const value = { ...draft };
    draftState = { value, error: null, persisted: false, dirty: true };
    return queueStorageOperation(draftKey, async () => {
      try {
        await writeStoredPreference(draftKey, `Contribution draft`, value);
        if (draftRevision === revision) draftState = { value, error: null, persisted: useLocalStorage, dirty: false };
        return { persisted: useLocalStorage };
      } catch (error) {
        if (draftRevision === revision && draftState) draftState.error = error instanceof Error ? error.message : `The draft could not be saved`;
        throw error;
      }
    });
  },
  clear: () => {
    const revision = ++draftRevision;
    return queueStorageOperation(draftKey, async () => {
      await writeStoredPreference(draftKey, `Contribution draft`, emptyDraft());
      if (draftRevision === revision) draftState = { value: emptyDraft(), error: null, persisted: useLocalStorage, dirty: false };
      return { persisted: useLocalStorage };
    });
  },
};

const failure = (error: unknown): { state: `unavailable` | `denied` | `error`; message: string } => {
  const code = getErrorCode(error);
  if ([`app/connection-required`, `PGRST202`, `PGRST205`, `42P01`, `42883`].includes(code)) return { state: `unavailable`, message: submissionUnavailable };
  if ([`42501`, `PGRST301`, `app/identity-changed`, `app/submission-denied`].includes(code)) return { state: `denied`, message: `This Submission Action Requires The Current Active Account` };
  if (code === `40001`) return { state: `error`, message: `This Submission Changed. Reload Before Reviewing It` };
  return { state: `error`, message: error instanceof Error && !code ? error.message : `The Submission Request Was Not Confirmed. Keep Your Draft And Retry` };
};

const readSubmission = (value: unknown): SubmissionRecord => {
  const row = value as Record<string, unknown> | null;
  const payload = row?.payload as Omit<SubmissionDraft, `version`> | undefined;
  if (!row || typeof row.id !== `string` || !Number.isSafeInteger(row.number) || !Number.isSafeInteger(row.revision)
    || !payload || !isDraft({ ...payload, version: 1 }) || ![`review`, `approved`, `rejected`, `changes-requested`].includes(String(row.status))
    || typeof row.account_id !== `string` || typeof row.created_at !== `string` || typeof row.updated_at !== `string`) throw new Error(`The Submission Response Has An Unsupported Format`);
  return { ...payload, mediaUrl: payload.mediaUrl ?? ``, id: row.id, number: row.number as number, revision: row.revision as number,
    authorId: row.account_id, status: row.status as SubmissionRecord[`status`], createdAt: row.created_at, updatedAt: row.updated_at,
    reviewerNote: typeof row.reviewer_note === `string` ? row.reviewer_note : undefined, entryId: typeof row.entry_id === `string` ? row.entry_id : undefined };
};

const request = async <T>(operation: (signal: AbortSignal) => PromiseLike<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try { return await operation(controller.signal); }
  finally { clearTimeout(timeout); }
};

const getPage = async (owner: boolean, cursor?: string): Promise<SubmissionPageResult> => {
  try {
    const scope = requireCurrentAccount();
    if (owner && !canAccessOwner(scope.account)) throw Object.assign(new Error(`Owner Access Required`), { code: `app/submission-denied` });
    const before = cursor ? Number(cursor) : null;
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) throw new Error(`Return To The Latest Submissions Page`);
    let query = scope.client.from(`catalog_submissions`).select(`*`).order(`number`, { ascending: false }).limit(51);
    if (!owner) query = query.eq(`account_id`, scope.account.id);
    if (before !== null) query = query.lt(`number`, before);
    const { data, error } = await request((signal) => query.abortSignal(signal));
    requireCurrentAccount(scope.account, scope.revision);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error(`The Submission List Was Not Confirmed`);
    const rows = data.map(readSubmission);
    const records = rows.slice(0, 50);
    return { state: `ready`, records, message: `${records.length} Submission(s) Loaded · Up To 50 On This Page`, nextCursor: rows.length > 50 ? String(records.at(-1)?.number) : null };
  } catch (error) { return { ...failure(error), records: null, nextCursor: null }; }
};

export const createSubmissionRequestId = (): string => randomUUID();

export const submissionService: SubmissionService & { configured: boolean } = {
  configured: supabaseConfigured,
  getOwnPage: (cursor) => getPage(false, cursor),
  getReviewPage: (cursor) => getPage(true, cursor),
  getById: async (id) => {
    const scope = requireCurrentAccount();
    const { data, error } = await request((signal) => scope.client.from(`catalog_submissions`).select(`*`).eq(`id`, id).abortSignal(signal).single());
    requireCurrentAccount(scope.account, scope.revision);
    if (error) throw new Error(failure(error).message);
    return readSubmission(data);
  },
  submit: async (draft, requestId) => {
    try {
      const errors = validateDraft(draft);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      const scope = requireCurrentAccount();
      const { version, ...payload } = draft;
      const { data, error } = await request((signal) => scope.client.rpc(`submit_catalog_entry`, { p_request_id: requestId, p_payload: payload, p_expected_auth_uid: scope.account.authUid }).abortSignal(signal));
      requireCurrentAccount(scope.account, scope.revision);
      if (error) throw error;
      const record = readSubmission(Array.isArray(data) ? data[0] : data);
      return { state: `committed`, record, message: `Submission Saved For Owner Review. It Is Not Published` };
    } catch (error) { return { ...failure(error), record: null }; }
  },
  review: async (record, status, note, entryId) => {
    const scope = requireCurrentAccount();
    if (!canAccessOwner(scope.account)) throw new Error(`Owner Access Required`);
    const { data, error } = await request((signal) => scope.client.rpc(`review_catalog_submission`, {
      p_id: record.id, p_status: status, p_note: note.trim(), p_entry_id: entryId ?? null,
      p_expected_revision: record.revision, p_expected_auth_uid: scope.account.authUid,
    }).abortSignal(signal));
    requireCurrentAccount(scope.account, scope.revision);
    if (error) throw new Error(failure(error).message);
    const saved = readSubmission(Array.isArray(data) ? data[0] : data);
    if (saved.id !== record.id || saved.status !== status || saved.revision <= record.revision) throw new Error(`The Review Save Was Not Confirmed`);
    return saved;
  },
};
