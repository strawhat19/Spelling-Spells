export type SubmissionKind = 'new-spell' | 'correction';
export type SubmissionStatus = 'pending' | 'approved' | 'changes-requested' | 'declined';

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
  reviewerNote?: string;
};

export type SubmissionField = Exclude<keyof SubmissionDraft, 'version' | 'kind'>;
export type SubmissionErrors = Partial<Record<SubmissionField, string>>;
export type SubmissionPageResult = {
  state: 'unavailable' | 'ready' | 'error';
  message: string;
  records: SubmissionRecord[] | null;
  nextCursor: string | null;
};

export type SubmissionService = {
  submit: (draft: SubmissionDraft) => Promise<{ state: 'unavailable' | 'committed' | 'error'; message: string; record: SubmissionRecord | null }>;
  getOwnPage: (cursor?: string) => Promise<SubmissionPageResult>;
  getReviewPage: (cursor?: string) => Promise<SubmissionPageResult>;
  review: (id: string, status: Exclude<SubmissionStatus, 'pending'>, note: string) => Promise<{ state: 'unavailable' | 'committed' | 'error'; message: string }>;
};
