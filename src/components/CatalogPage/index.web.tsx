import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import TextReveal from '../TextReveal';
import { SpellCard } from '../SpellCard';
import { useEffect, useRef } from 'react';
import PageMetadata from '../PageMetadata';
import { useCatalogPage, type CatalogSort } from './useCatalogPage';

const CatalogPage = ({ savedOnly = false }: { savedOnly?: boolean }) => {
  const {
    sort, ready, error, query, skill, world, worlds, results, category, filtered,
    categories, savedCount, shelfWorlds, unavailableCount,
    savedFilter, setSort, setQuery, setSkill, setWorld, setCategory,
    saveScope, saveStatus, saveScopeKey, savedReady, saveMessage, refreshSaved,
    deviceSavedCount, presentation, clearing, importing, actionBusy, closeClear,
    confirmClear, requestClear, removeAll, importBookmarks, savedResolved,
    resultsVisible, resultsResolved, clearFilters, setSavedFilter,
  } = useCatalogPage(savedOnly);
  const clearTrigger = useRef<HTMLButtonElement>(null);
  const cancelClear = useRef<HTMLButtonElement>(null);
  const visibleWorlds = savedOnly ? shelfWorlds : worlds;
  const savedView = savedOnly || savedFilter;
  const opening = !ready || (savedView && !resultsVisible && !error && saveStatus !== `error` && saveStatus !== `cached` && saveStatus !== `pending`);
  const countLabel = savedResolved ? `Saved` : `Unconfirmed`;

  useEffect(() => {
    if (confirmClear) cancelClear.current?.focus();
  }, [confirmClear, saveScopeKey]);

  const cancelConfirmation = () => {
    closeClear();
    clearTrigger.current?.focus();
  };

  return (
    <section id={savedOnly ? `saved-page` : `catalog-page`} className={`ss-catalog${savedOnly ? ` ss-catalog--shelf` : ``}`} aria-labelledby="catalog-title">
      <PageMetadata
        noIndex={savedOnly}
        canonicalPath={savedOnly ? `/saved` : `/spells`}
        title={savedOnly ? `Your saved spells` : `The spell index`}
        description={savedOnly ? `Your personal shelf of bookmarked fictional spells. Revisit your private account collection or separate device bookmarks.` : `Find fictional spells by name, story world, language, purpose, and skill. Read exact spellings, pronunciation guides, and sourced word origins.`}
      />
      <div id="catalog-page-heading" className="ss-catalog-heading">
        <div className="ss-catalog-heading-copy">
          <p className="ss-catalog-eyebrow"><Icon name={savedOnly ? `bookmark` : `book`} size={16} />{savedOnly ? `A shelf of your own` : `Words from extraordinary worlds`}</p>
          <h1 id="catalog-title"><TextReveal id='catalog-title-copy' text={savedOnly ? `Your personal spellbook.` : `Find your next magic word.`} /></h1>
          <p>{savedOnly ? `The words you want to keep close. Revisit a favorite, find a forgotten incantation, or make room for your next discovery.` : `Browse incantations, invented languages, and the stories behind them. Search by name, meaning, language, or world.`}</p>
        </div>
        {savedOnly && <div id="saved-shelf-emblem" className="ss-catalog-shelf-emblem" aria-hidden="true"><Icon name="book" size={44} /><span>YOUR FIELD NOTES</span><i /><Icon name="spark" size={13} /></div>}
      </div>

      {savedOnly && <div id="saved-shelf-overview" className="ss-catalog-shelf-overview">
        <div id="saved-shelf-count" className="ss-catalog-shelf-stat"><Icon name="bookmark" size={19} /><div><strong>{savedResolved || savedCount > 0 ? savedCount : `…`}</strong><span>{countLabel} {savedCount === 1 ? `bookmark` : `bookmarks`}</span></div></div>
        <div id="saved-shelf-world-count" className="ss-catalog-shelf-stat"><Icon name="world" size={20} /><div><strong>{savedResolved || shelfWorlds.length > 0 ? shelfWorlds.length : `…`}</strong><span>{savedResolved ? `Story worlds` : `Worlds shown`}</span></div></div>
        <div id="saved-shelf-storage" className="ss-catalog-storage-note" role="status"><span className={`ss-catalog-device-badge${presentation.session || !savedResolved ? ` is-session` : ``}`}><Icon name="shield" size={13} />{presentation.badge}</span><p>{presentation.description}</p></div>
      </div>}

      {savedOnly && saveScope === `account` && deviceSavedCount > 0 && <div id="saved-device-import" className="ss-catalog-import"><div><h2>Bring your device bookmarks along.</h2><p>{deviceSavedCount} local {deviceSavedCount === 1 ? `bookmark is` : `bookmarks are`} separate from this account. Import copies supported spell bookmarks into this account without replacing its collection. Local bookmarks are kept for when you sign out.</p></div><button id="saved-device-import-button" type="button" disabled={!savedReady || actionBusy || confirmClear} onClick={() => void importBookmarks()}><Icon name="bookmark" size={15} />{importing ? `Importing…` : `Import device bookmarks`}</button></div>}

      <div id="catalog-filter-bar" className="ss-catalog-filters">
        <label id="catalog-search-label" className="ss-catalog-search" htmlFor="catalog-search"><Icon name="search" size={18} /><span className="ss-visually-hidden">{savedOnly ? `Search your saved spells` : `Search the spellbook`}</span><input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={savedOnly ? `Find a spell on your shelf…` : `A spell, a meaning, a world…`} />{query && <button id="catalog-clear-search" type="button" aria-label="Clear search" onClick={() => setQuery(``)}><Icon name="close" size={16} /></button>}</label>
        <label id="catalog-world-filter-label" className="ss-catalog-select-label" htmlFor="catalog-world-filter"><span>World</span><select id="catalog-world-filter" value={world} onChange={(event) => setWorld(event.target.value)}><option value="">All worlds</option>{world && !visibleWorlds.some((item) => item.id === world) && <option value={world}>{worlds.find((item) => item.id === world)?.name ?? `Selected world`} · {savedResolved ? `no saved spells` : `collection unconfirmed`}</option>}{visibleWorlds.map((item) => <option key={item.id} id={`catalog-world-option-${item.id}`} value={item.id}>{item.name}</option>)}</select></label>
        <label id="catalog-category-filter-label" className="ss-catalog-select-label" htmlFor="catalog-category-filter"><span>Use</span><select id="catalog-category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All uses</option>{category && !categories.includes(category) && <option value={category}>{category} · {savedResolved ? `no saved spells` : `collection unconfirmed`}</option>}{categories.map((item, index) => <option key={item} id={`catalog-category-option-${index}`} value={item}>{item}</option>)}</select></label>
        <label id="catalog-skill-filter-label" className="ss-catalog-select-label" htmlFor="catalog-skill-filter"><span>Skill</span><select id="catalog-skill-filter" value={skill} onChange={(event) => setSkill(event.target.value)}><option value="">All levels</option>{[`Beginner`, `Intermediate`, `Advanced`].map((item) => <option key={item} id={`catalog-skill-option-${item.toLowerCase()}`} value={item}>{item}</option>)}</select></label>
      </div>
      <div id="catalog-results-toolbar" className="ss-catalog-toolbar">
        <p id="catalog-result-count" role="status">{resultsResolved ? `${results.length} ${results.length === 1 ? `spell` : `spells`}${filtered ? ` found` : savedOnly ? ` on your shelf` : ` in the archive`}` : resultsVisible ? `${results.length} spells shown · account view not confirmed` : savedView ? `Your saved collection is not confirmed yet` : `Opening the spellbook…`}</p>
        <div className="ss-catalog-toolbar-actions">
          <label id="catalog-sort-label" className="ss-catalog-sort" htmlFor="catalog-sort"><span>Sort</span><select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>{savedOnly ? <option value="recent">Recently saved</option> : <option value="catalog">Archive order</option>}<option value="name">Name, A–Z</option><option value="world">Story world</option></select></label>
          {!savedOnly && <label id="catalog-saved-filter-label" className="ss-catalog-saved-filter" htmlFor="catalog-saved-filter"><input id="catalog-saved-filter" type="checkbox" checked={savedFilter} onChange={(event) => setSavedFilter(event.target.checked)} /><Icon name="bookmark" size={15} />Saved only</label>}
          {filtered && <button id="catalog-reset-filters" type="button" onClick={clearFilters}><Icon name="close" size={14} />Clear filters</button>}
          {savedOnly && savedCount > 0 && <button ref={clearTrigger} id="catalog-clear-saved" type="button" disabled={!savedReady || actionBusy} aria-expanded={confirmClear} aria-controls="saved-clear-confirmation" onClick={requestClear}><Icon name="close" size={14} />Clear shelf</button>}
        </div>
      </div>

      {confirmClear && <div id="saved-clear-confirmation" className="ss-catalog-clear-confirmation" role="group" aria-labelledby="saved-clear-heading" onKeyDown={(event) => { if (event.key === `Escape` && !actionBusy) cancelConfirmation(); }}><div><h2 id="saved-clear-heading">Clear {saveScope === `account` ? `your account` : presentation.session ? `this session’s` : `this device’s`} shelf?</h2><p>This removes every bookmark from {presentation.destination}, including all {savedCount} currently shown, not just filtered results. {saveScope === `account` ? `Separate device bookmarks are kept. ` : ``}The public spell archive and reading history are not deleted.</p></div><div className="ss-catalog-clear-actions"><button ref={cancelClear} id="saved-clear-cancel" type="button" disabled={actionBusy} onClick={cancelConfirmation}>Keep my spells</button><button id="saved-clear-confirm" type="button" disabled={!savedReady || actionBusy} onClick={() => void removeAll()}><Icon name="close" size={14} />{clearing ? `Clearing…` : `Clear all bookmarks`}</button></div></div>}
      {error && <p id="catalog-storage-warning" className="ss-catalog-warning" role="status"><Icon name="shield" size={17} />{error}</p>}
      {!savedOnly && (saveMessage || !savedReady) && <p id="catalog-save-status" className="ss-catalog-warning" role="status"><Icon name="shield" size={17} />{presentation.description}</p>}
      {saveScope === `account` && (!savedReady || saveStatus === `server`) && !actionBusy && <button id="catalog-retry-saved" className="ss-catalog-retry" type="button" onClick={refreshSaved}><Icon name="bookmark" size={15} />Reconnect saved collection</button>}
      {savedOnly && ready && unavailableCount > 0 && <p id="saved-unavailable-records" className="ss-catalog-warning"><Icon name="book" size={17} />{unavailableCount} {savedResolved ? `saved` : `unconfirmed`} {unavailableCount === 1 ? `entry isn’t` : `entries aren’t`} in this catalog. {unavailableCount === 1 ? `Its bookmark is` : `Their bookmarks are`} preserved until you clear the shelf.</p>}
      {opening ? <div id="catalog-skeleton-grid" className="ss-catalog-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div key={index} id={`catalog-skeleton-${index}`} className="ss-catalog-skeleton"><span /><span /><span /></div>)}</div> : !resultsVisible ? <div id="saved-unconfirmed-state" className="ss-catalog-empty" role="status"><Icon name="shield" size={37} /><h2>Your shelf isn’t confirmed yet.</h2><p>{presentation.description} This is not an empty-collection result.</p><AppLink id="saved-unconfirmed-browse" href="/spells"><Icon name="book" size={16} />Browse the public spellbook</AppLink></div> : results.length ? <div id="catalog-spell-grid" className="ss-catalog-grid">{results.map((spell) => <SpellCard key={spell.id} spell={spell} />)}</div> : <div id="catalog-empty-state" className="ss-catalog-empty"><Icon name={savedOnly && !savedCount ? `bookmark` : `search`} size={37} /><h2>{!resultsResolved ? `No matches in this unconfirmed view.` : savedOnly && !savedCount ? `A blank page, for now.` : savedOnly ? `No matches on your shelf.` : `No spells on this page.`}</h2><p>{!resultsResolved ? `Your current account collection is not confirmed. Reconnect before treating this view as complete.` : savedOnly && !savedCount ? `Choose a spell that catches your eye and tap its bookmark to save it to ${presentation.destination}.` : savedOnly ? `Try another word or clear your filters. Your saved bookmarks have not been changed.` : `Try another spelling, story world, or filter. Your next discovery might be one word away.`}</p>{filtered && !(savedOnly && !savedCount) ? <button id="catalog-empty-reset" type="button" onClick={clearFilters}><Icon name="close" size={16} />Clear filters</button> : <AppLink id="catalog-empty-browse" href="/spells"><Icon name="book" size={16} />Explore the spellbook<Icon name="arrow" size={16} /></AppLink>}</div>}
      {savedOnly && savedCount > 0 && <div id="saved-shelf-discover" className="ss-catalog-discover"><span><Icon name="spark" size={17} />There’s room for another discovery.</span><AppLink id="saved-shelf-browse" href="/spells">Find your next spell<Icon name="arrow" size={16} /></AppLink></div>}
      {savedOnly && <p id="catalog-editorial-note" className="ss-catalog-editorial"><Icon name="book" size={15} />{saveScope === `account` ? `This account shelf is private. Device bookmarks and local reading history stay separate.` : `Use a spell’s bookmark to remove it from your shelf. Clearing browser or app data can remove local bookmarks.`}</p>}
    </section>
  );
};

export default CatalogPage;
