export type InfoKind = `about` | `terms` | `contact` | `privacy` | `not-found`;

export const informationPages = {
  about: {
    icon: `book`,
    kicker: `The story behind this spellbook`,
    title: `A little wonder. A lot of words.`,
    intro: `Spelling Spells is a collection of fictional spells, magical words, and incantations from books, films, games, and stories. It is made for curious readers who want to know more than a spell's name.`,
    sections: [
      { title: `What you will find`, body: `Each entry brings together exact spelling, a readable pronunciation guide, syllables, definitions, usage, language notes, etymology, source references, and editorial danger, utility, and skill levels. A dragon shout stays a dragon shout; a charm stays a charm.` },
      { title: `Words, in their own worlds`, body: `We keep a spell's source and context close to its meaning. The collection starts with a small, curated catalog. It is not a claim to include every spell, translation, or adaptation.` },
      { title: `Careful with origins and sounds`, body: `Etymologies are labelled Confirmed, Suggested, or Unconfirmed. Pronunciation notes distinguish creator guidance from editorial sound aids. A computer voice is a reading aid rather than an official recording.` },
      { title: `A spellbook you can make your own`, body: `Browsing is public. Saved favorites, recently viewed entries, and theme preference stay in browser or device storage. You do not need an account, and this version does not sync your collection to a server.` },
      { title: `A Piratechs project`, body: `Spelling Spells is built by Piratechs for the pleasure of exploring language and stories. Fictional worlds and their names remain the work of their respective creators.` },
    ],
  },
  terms: {
    icon: `book`,
    kicker: `Terms of use`,
    title: `A few notes before you wander.`,
    intro: `These terms describe use of Spelling Spells, a public reference collection about fictional magic. You may browse the catalog and keep a personal saved collection on your device.`,
    sections: [
      { title: `Reference content`, body: `The collection is for learning and entertainment. Effects described in entries belong to fictional stories and games. Editorial ratings are our reading guides, not official canon, gameplay statistics, or real-world instructions.` },
      { title: `Accuracy and sources`, body: `Entries link to references where possible. Pronunciation, translation, and interpretation may vary across editions and adaptations. We aim to be clear about the basis of each note; linked creators and original works provide further context.` },
      { title: `Creators and ownership`, body: `Spell names, fictional languages, world names, and source works belong to their respective rights holders. This project is an independent reference collection and is not presented as endorsed by those creators. Original site artwork and editorial writing belong to their respective authors.` },
      { title: `Personal saved data`, body: `Favorites and preferences are stored locally in this version. Clearing browser or app storage removes them, and they are not automatically synced or backed up. The app reports storage problems when it can detect them.` },
      { title: `External references`, body: `Source links open sites run by others. Those sites have their own content, availability, and privacy practices. Following a link does not make that site part of Spelling Spells.` },
      { title: `Questions and corrections`, body: `For questions about the project, credit, or an entry that needs a correction, use the Contact page to reach Piratechs.` },
    ],
  },
  contact: {
    icon: `book`,
    kicker: `A conversation beyond the spellbook`,
    title: `Found a word worth sharing?`,
    intro: `Have a source correction, a pronunciation reference, or a spell you would love to see included? Start with Piratechs, the team behind Spelling Spells.`,
    sections: [
      { title: `Help us follow the source`, body: `For an entry correction or suggestion, include the spell's exact name, its story or media source, and a link to the creator's reference or original work when available. Tell us what should change and why.` },
      { title: `Credit and rights`, body: `If a credit or attribution needs attention, identify the entry and the relevant work. A clear reference helps us understand the request.` },
      { title: `Reach Piratechs`, body: `Visit the Piratechs website for its available contact information. This app does not send a contact message or online form submission. The Contribute page lets you prepare a device-only draft, but it does not reach the team.` },
    ],
  },
  privacy: {
    icon: `shield`,
    kicker: `Privacy policy`,
    title: `Your spellbook stays close to home.`,
    intro: `This version of Spelling Spells uses local browser or device storage. Account screens are a disconnected preview: no user accounts are created, no credentials are collected, and cloud sync and third-party analytics are not connected.`,
    sections: [
      { title: `What the app keeps`, body: `The app stores saved spell IDs, recently viewed spell IDs, your theme preference, and account-navigation display preferences on the current browser or device. If you choose Save Draft, your contribution text is stored on that device too; it is not sent to an editor. Unsaved draft edits can remain in memory while the app is open. Catalog content is bundled with the app. Search and filter choices are not sent to a Spelling Spells backend.` },
      { title: `Where that data lives`, body: `On the web, preferences use localStorage; mobile uses device storage. This version does not upload those collections to a server. Browsers and operating systems control the storage location and when it may be cleared.` },
      { title: `Optional browser speech`, body: `If you choose the computer voice reading aid, the browser or operating system's speech engine processes the selected spell text. Voice availability and processing depend on that provider; this app does not record your voice or request microphone access.` },
      { title: `Links and hosting`, body: `Opening a source or Piratechs link sends you to an external website with its own privacy practices. The service hosting this website may process ordinary connection information, such as an IP address and request logs, to serve the page.` },
      { title: `Your choices`, body: `You can remove individual saved spells or clear your saved collection on the Saved page. To remove all local preferences and viewing history, clear this site's browser data or the app's device storage. You can clear the device contribution draft on the Contribute page. No cloud account deletion is needed in this version.` },
      { title: `Questions`, body: `For privacy questions about Spelling Spells, visit the Contact page and follow the Piratechs contact link.` },
    ],
  },
  'not-found': {
    icon: `search`,
    kicker: `An unwritten page`,
    title: `This page slipped out of the book.`,
    intro: `The address may be incomplete or the page may have moved. The spellbook is still here, ready for your next discovery.`,
    sections: [],
  },
} satisfies Record<InfoKind, { icon: string; title: string; intro: string; kicker: string; sections: { title: string; body: string }[] }>;
