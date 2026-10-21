import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import TextReveal from '../TextReveal';
import { getSpellPath } from '../../shared/catalog/routes';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { getWorldPath } from '../../shared/catalog/metadata';

const WorldsPage = () => {
  const { ready, spells, worlds, catalogError, reloadCatalog } = useSpells();
  return (
    <section id="worlds-page" className="ss-worlds" aria-labelledby="worlds-title"><header id="worlds-page-heading" className="ss-worlds-heading"><p><Icon name="world" size={16} />Every world has its own words</p><h1 id="worlds-title"><TextReveal id='worlds-title-copy' text={`Choose your next chapter.`} /></h1><span>From a wand's quiet glow to the language of dragons, explore the stories that give each spell its meaning.</span></header>
      {!ready ? <p id="worlds-loading" className="ss-worlds-loading" role="status">Opening the story worlds…</p> : <div id="worlds-grid" className="ss-worlds-grid">{worlds.map((world, index) => { const entries = spells.filter((spell) => spell.worldId === world.id); return <article key={world.id} id={`world-${world.id}`} className={`ss-worlds-card ss-worlds-card--${index}`} aria-labelledby={`world-${world.id}-title`}><div id={`world-${world.id}-art`} className="ss-worlds-art" aria-hidden="true"><svg viewBox="0 0 500 230"><defs><radialGradient id={`world-${world.id}-glow`}><stop stopColor={index === 0 ? `#6039D8` : index === 1 ? `#FFC857` : `#CF785D`} stopOpacity=".3" /><stop offset="1" stopColor="#6039D8" stopOpacity="0" /></radialGradient></defs><rect width="500" height="230" fill={`url(#world-${world.id}-glow)`} /><g fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="250" cy="105" r="87" /><circle cx="250" cy="105" r="100" strokeDasharray="2 10" /><path d={index === 0 ? `M183 190V108l20-32 20 32v82M224 190V80l23-39 23 39v110M271 190V124l17-29 17 29v66M166 190h157M229 88h37M234 114h10v21h-10M253 114h10v21h-10M187 130h16M281 148h11` : index === 1 ? `M142 190l50-92 42 71 29-123 70 144M233 168l30-123 25 46M188 104l13 22M258 66l-14 24M155 190h190` : `M209 190Q162 137 215 78Q270 13 284 47Q236 82 274 112Q318 132 286 190M221 190Q202 148 235 113M238 174Q265 147 252 119`} /><path d="M132 79h8m-4-4v8M340 72h12m-6-6v12M174 44h5m-2.5-2.5v5" /></g></svg></div><div className="ss-worlds-card-body"><p className="ss-worlds-medium"><Icon name={world.medium === `Games` ? `wand` : `book`} size={14} />{world.medium}<span>{entries.length} {entries.length === 1 ? `spell` : `spells`}</span></p><h2 id={`world-${world.id}-title`}><AppLink id={`world-${world.id}-detail`} href={getWorldPath(world)}>{world.name}</AppLink></h2><p className="ss-worlds-description">{world.description}</p><div id={`world-${world.id}-samples`} className="ss-worlds-samples">{entries.slice(0, 3).map((spell) => <AppLink key={spell.id} id={`world-${world.id}-spell-${spell.id}`} href={getSpellPath(spell)}>{spell.name}</AppLink>)}</div><AppLink id={`world-${world.id}-browse`} className="ss-worlds-browse" href={`/spells?world=${encodeURIComponent(world.id)}`}>Explore this world<Icon name="arrow" size={17} /></AppLink></div></article>; })}</div>}
      {catalogError && <p id="worlds-catalog-error" role="alert">{catalogError} <button id="worlds-catalog-retry" onClick={reloadCatalog}>Try Again</button></p>}
      {ready && !catalogError && worlds.length === 0 && <p id="worlds-empty" role="status">No universes have published entries yet.</p>}
      <aside id="worlds-editorial-note" className="ss-worlds-note"><Icon name="book" size={23} /><div><h2>Different worlds. Different kinds of magic.</h2><p>This collection includes charms, shouts, magical words, and incantations. Each entry keeps its source's context rather than treating every word as the same kind of spell.</p><AppLink id="worlds-about-link" href="/about">How we build the collection<Icon name="arrow" size={15} /></AppLink></div></aside>
    </section>
  );
};

export default WorldsPage;
