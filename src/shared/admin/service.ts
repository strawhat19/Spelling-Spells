export type OwnerRecordView = `users` | `feedback`;
export type OwnerRecordsSnapshot = {
  source: null;
  records: null;
  state: `unavailable`;
  message: string;
};

// This boundary intentionally has no Firebase import, network call or local records.
// Future adapters must derive current Owner authority server-side before subscribing.
export const ownerRecordsService = {
  subscribe: (view: OwnerRecordView, receive: (snapshot: OwnerRecordsSnapshot) => void): (() => void) => {
    receive({
      source: null,
      records: null,
      state: `unavailable`,
      message: view === `users`
        ? `Account directory reporting is not connected. No user records have been loaded.`
        : `Feedback intake and review are not connected. No messages have been received by this interface.`,
    });
    return () => {};
  },
};
