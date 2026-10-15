import type { SpellsContextValue } from '../../shared/spellsContext/SpellsContext';

type SavedCollectionState = Pick<SpellsContextValue,
  `ready` | `saveBusy` | `saveScope` | `saveStatus` | `savedReady` | `storageMode` | `saveMessage`
>;

export const getSavedCollectionPresentation = (collection: SavedCollectionState) => {
  const account = collection.saveScope === `account`;
  const session = !account && collection.storageMode === `session`;
  const destination = account ? `your account` : session ? `this session` : `this device`;
  let badge = account ? `Private Account Shelf` : session ? `This Session Only` : `On This Device`;
  let description = account
    ? `Your private account bookmarks, confirmed by the server. Device bookmarks stay separate unless you import them.`
    : session ? `Bookmarks are kept only for this session and may disappear when you leave. They are not uploaded to an account.`
      : `Bookmarks stay in this browser or app, separate from any account. Clearing local data can remove them.`;
  let blockedLabel = `Opening saved spells…`;

  if (collection.saveBusy || collection.saveStatus === `pending`) {
    badge = `Save Confirmation Pending`;
    blockedLabel = `Waiting for save confirmation…`;
    description = `A change is awaiting confirmation. The account view may be incomplete; more changes are paused.`;
  } else if (account && collection.saveStatus === `cached`) {
    badge = `Unconfirmed Account View`;
    blockedLabel = `Account view not confirmed`;
    description = `This is a cached account view, not a confirmed live collection. Counts may be incomplete and saving is paused.`;
  } else if (account && collection.saveStatus === `error`) {
    badge = `Account Shelf Unavailable`;
    blockedLabel = `Account saving unavailable`;
    description = `The account collection could not be confirmed. Any entries shown are not a current server-confirmed view.`;
  } else if (!account && collection.ready && !collection.storageMode) {
    badge = `Device Shelf Unavailable`;
    blockedLabel = `Device saving unavailable`;
    description = `Device bookmarks could not be opened. This is not a confirmed empty shelf, and no account upload has occurred.`;
  } else if (!collection.ready || !collection.savedReady) {
    badge = `Opening Your Shelf`;
    description = account
      ? `Waiting for your private account collection. An empty view here does not mean you have no saved spells.`
      : `Waiting for your session and device bookmarks before enabling changes.`;
  }

  return {
    badge,
    account,
    session,
    destination,
    blockedLabel,
    description: collection.saveMessage ? `${description} ${collection.saveMessage}` : description,
    saveLabel: (saved: boolean) => !collection.savedReady ? blockedLabel
      : saved ? account ? `Saved to your account` : session ? `Saved for this session` : `Saved on this device`
        : `Save to ${destination}`,
  };
};
