import { useLocalStorage } from '../config';
import { readStoredPreference, writeStoredPreference, queueStorageOperation } from '../common/storage';
import type { SubmissionDraft, SubmissionErrors, SubmissionService } from './types';

const draftKey = `spelling-spells:submission-draft:v1`;
type StoredSubmissionDraft = Omit<SubmissionDraft, `mediaUrl`> & { mediaUrl?: string };
export const submissionUnavailable = `Submissions are not connected yet. Nothing has been sent or added to the review queue.`;
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

// This adapter is intentionally disconnected. A future server derives identity and
// review capabilities from a verified session, never from caller-supplied roles.
export const submissionService: SubmissionService = {
  submit: async () => ({ state: `unavailable`, message: submissionUnavailable, record: null }),
  review: async () => ({ state: `unavailable`, message: submissionUnavailable }),
  getOwnPage: async () => ({ state: `unavailable`, message: submissionUnavailable, records: null, nextCursor: null }),
  getReviewPage: async () => ({ state: `unavailable`, message: submissionUnavailable, records: null, nextCursor: null }),
};
