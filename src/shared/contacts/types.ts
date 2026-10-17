export type ContactStatus = `new` | `read` | `archived`;
export type ContactInput = { name: string; email: string; subject: string; message: string; website: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;
export type ContactReceipt = { id: string; number: number; createdAt: string };
export type ContactRecord = ContactReceipt & {
  name: string;
  email: string;
  subject: string;
  message: string;
  updatedAt: string;
  status: ContactStatus;
};
export type ContactSnapshot = {
  message: string;
  nextCursor: number | null;
  records: ContactRecord[] | null;
  realtime: `connecting` | `subscribed` | `unavailable`;
  state: `loading` | `ready` | `error` | `denied` | `unavailable`;
};
