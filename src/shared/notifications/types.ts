export type NotificationRecord = {
  id: string;
  slug: string;
  title: string;
  body: string;
  number: number;
  suffix: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  createdAt: string;
  updatedAt: string;
  kind: `development` | `announcement`;
  status: `draft` | `published`;
};

export type NotificationDraft = Pick<NotificationRecord, `slug` | `title` | `body` | `suffix` | `kind` | `status` | `linkUrl` | `linkLabel`>;
export type NotificationState = `loading` | `ready` | `error` | `denied` | `unavailable`;
export type NotificationSnapshot = {
  state: NotificationState;
  records: NotificationRecord[];
  message: string | null;
  nextCursor: number | null;
  realtime: `connecting` | `subscribed` | `unavailable`;
};
export type NotificationReadsSnapshot = {
  readIds: string[];
  state: NotificationState;
  message: string | null;
};
