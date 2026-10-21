export type SubmissionKind = 'new-spell' | 'correction';
export type SubmissionStatus = 'review' | 'approved' | 'changes-requested' | 'rejected';

export type SubmissionDraft = {
  version: 1;
  kind: SubmissionKind;
  name: string;
  world: string;
  pronunciation: string;
  definition: string;
  sourceUrl: string;
  mediaUrl: string;
  notes: string;
};

export type SubmissionRecord = Omit<SubmissionDraft, 'version'> & {
  id: string;
  number: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  status: SubmissionStatus;
  revision: number;
  entryId?: string;
  reviewerNote?: string;
};

export type SubmissionField = Exclude<keyof SubmissionDraft, 'version' | 'kind'>;
export type SubmissionErrors = Partial<Record<SubmissionField, string>>;
export type SubmissionPageResult = {
  state: 'unavailable' | 'ready' | 'error' | 'denied';
  message: string;
  records: SubmissionRecord[] | null;
  nextCursor: string | null;
};

export type SubmissionService = {
  submit: (draft: SubmissionDraft, requestId: string) => Promise<{ state: 'unavailable' | 'committed' | 'error' | 'denied'; message: string; record: SubmissionRecord | null }>;
  getOwnPage: (cursor?: string) => Promise<SubmissionPageResult>;
  getReviewPage: (cursor?: string) => Promise<SubmissionPageResult>;
  getById: (id: string) => Promise<SubmissionRecord>;
  review: (record: SubmissionRecord, status: Exclude<SubmissionStatus, 'review'>, note: string, entryId?: string) => Promise<SubmissionRecord>;
};
