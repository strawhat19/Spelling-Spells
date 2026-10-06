import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import { SpellCard } from '../SpellCard';
import { useCatalogPage } from './useCatalogPage';

const CatalogPage = ({ savedOnly = false }: { savedOnly?: boolean }) => {
  const { ready, error, query, skill, world, worlds, results, category, categories, savedFilter, setQuery, setSkill, setWorld, setCategory, clearSaved, clearFilters, setSavedFilter } = useCatalogPage(savedOnly);
  const filtered = Boolean(query || skill || world || category || (!savedOnly && savedFilter));

  return (
    <section id={savedOnly ? `saved-page` : `catalog-page`} className="ss-catalog" aria-labelledby="catalog-title">
      <div id="catalog-page-heading" className="ss-catalog-heading"><p className="ss-catalog-eyebrow"><Icon name={savedOnly ? `bookmark` : `book`} size={16} />{savedOnly ? `Your own little spellbook` : `Words from extraordinary worlds`}</p><h1 id="catalog-title">{savedOnly ? `Your saved spells.` : `Find your next magic word.`}</h1><p>{savedOnly ? `Your favorites stay on this device. A collection to come back to, one spell at a time.` : `Browse incantations, invented languages, and the stories behind them. Search by name, meaning, language, or world.`}</p></div>
      <div id="catalog-filter-bar" className="ss-catalog-filters">
        <label id="catalog-search-label" className="ss-catalog-search" htmlFor="catalog-search"><Icon name="search" size={18} /><span className="ss-visually-hidden">Search the spellbook</span><input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="A spell, a meaning, a world…" />{query && <button id="catalog-clear-search" type="button" aria-label="Clear search" onClick={() => setQuery(``)}><Icon name="close" size={16} /></button>}</label>
        <label id="catalog-world-filter-label" className="ss-catalog-select-label" htmlFor="catalog-world-filter"><span>World</span><select id="catalog-world-filter" value={world} onChange={(event) => setWorld(event.target.value)}><option value="">All worlds</option>{worlds.map((item) => <option key={item.id} id={`catalog-world-option-${item.id}`} value={item.id}>{item.name}</option>)}</select></label>
        <label id="catalog-category-filter-label" className="ss-catalog-select-label" htmlFor="catalog-category-filter"><span>Use</span><select id="catalog-category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All uses</option>{categories.map((item, index) => <option key={item} id={`catalog-category-option-${index}`} value={item}>{item}</option>)}</select></label>
        <label id="catalog-skill-filter-label" className="ss-catalog-select-label" htmlFor="catalog-skill-filter"><span>Skill</span><select id="catalog-skill-filter" value={skill} onChange={(event) => setSkill(event.target.value)}><option value="">All levels</option>{[`Beginner`, `Intermediate`, `Advanced`].map((item) => <option key={item} id={`catalog-skill-option-${item.toLowerCase()}`} value={item}>{item}</option>)}</select></label>
      </div>
      <div id="catalog-results-toolbar" className="ss-catalog-toolbar"><p id="catalog-result-count" role="status">{ready ? `${results.length} ${results.length === 1 ? `spell` : `spells`}${filtered ? ` found` : ` in this collection`}` : `Opening the spellbook…`}</p><div className="ss-catalog-toolbar-actions">{!savedOnly && <label id="catalog-saved-filter-label" className="ss-catalog-saved-filter" htmlFor="catalog-saved-filter"><input id="catalog-saved-filter" type="checkbox" checked={savedFilter} onChange={(event) => setSavedFilter(event.target.checked)} /><Icon name="bookmark" size={15} />Saved only</label>}{filtered && <button id="catalog-reset-filters" type="button" onClick={clearFilters}><Icon name="close" size={14} />Clear filters</button>}{savedOnly && results.length > 0 && <button id="catalog-clear-saved" type="button" onClick={() => void clearSaved()}><Icon name="bookmark" size={14} />Clear saved spells</button>}</div></div>
      {error && <p id="catalog-storage-warning" className="ss-catalog-warning" role="status"><Icon name="shield" size={17} />{error}</p>}
      {!ready ? <div id="catalog-skeleton-grid" className="ss-catalog-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div key={index} id={`catalog-skeleton-${index}`} className="ss-catalog-skeleton"><span /><span /><span /></div>)}</div> : results.length ? <div id="catalog-spell-grid" className="ss-catalog-grid">{results.map((spell) => <SpellCard key={spell.id} spell={spell} />)}</div> : <div id="catalog-empty-state" className="ss-catalog-empty"><Icon name={savedOnly ? `bookmark` : `search`} size={37} /><h2>{savedOnly && !filtered ? `A blank page, for now.` : `No spells on this page.`}</h2><p>{savedOnly && !filtered ? `Tap the bookmark on any spell to start your personal collection.` : `Try another spelling, story world, or filter. Your next discovery might be one word away.`}</p>{filtered ? <button id="catalog-empty-reset" type="button" onClick={clearFilters}><Icon name="close" size={16} />Clear filters</button> : <AppLink id="catalog-empty-browse" href="/spells"><Icon name="book" size={16} />Explore the spellbook<Icon name="arrow" size={16} /></AppLink>}</div>}
      <p id="catalog-editorial-note" className="ss-catalog-editorial"><Icon name="book" size={15} />All effects belong to fictional worlds. Danger, utility, and skill levels are editorial guides, with linked sources inside each entry.</p>
    </section>
  );
};

export default CatalogPage;
