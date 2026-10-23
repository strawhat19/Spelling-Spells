import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import TextReveal from '../TextReveal';
import PricingPlans from '../PricingPlans';
import { SpellCard } from '../SpellCard';
import { useHomePage } from './useHomePage';
import { useLandingMotion } from './useLandingMotion';
import HeroSpellCarousel from '../HeroSpellCarousel';

const HomePage = () => {
  const pageRef = useLandingMotion();
  const { ready, spells, worlds, query, curated, surprise, setQuery, visitSearch } = useHomePage();

  return (
    <div id="home-page" className="ss-home" ref={pageRef}>
      <section id="landing-hero" className="ss-home-hero" aria-labelledby="home-headline">
        <div id="home-hero-glow" className="ss-home-hero-glow" aria-hidden="true" />
        <div id='home-hero-motes' className='ss-home-hero-motes' aria-hidden='true'>{[0, 1, 2, 3, 4, 5].map((index) => <span key={index} id={`home-hero-mote-${index}`} />)}</div>
        <svg id="home-hero-orbits" className="ss-home-hero-orbits" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#D8C8F2" strokeWidth=".7"><ellipse cx="1090" cy="340" rx="535" ry="220" transform="rotate(-22 1090 340)" /><ellipse cx="1090" cy="340" rx="590" ry="252" transform="rotate(-22 1090 340)" /><path d="M-40 760Q410 824 781 555T1460 471" /></g><g fill="#FFC857"><path d="m1298 141 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" /><path d="m610 521 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" /><circle cx="551" cy="146" r="1.5" /><circle cx="117" cy="513" r="2" /><circle cx="1290" cy="550" r="1.5" /></g></svg>
        <img id="home-hero-watermark" className="ss-home-watermark" src="/brand/logo-mark.svg" alt="" aria-hidden="true" />
        <div id="home-hero-layout" className="ss-home-hero-layout">
          <div id="home-hero-copy" className="ss-home-hero-copy">
            <p id="home-eyebrow" className="ss-home-eyebrow"><Icon name="spark" size={15} />A field guide to fictional magic</p>
            <h1 id="home-headline"><TextReveal id='home-headline-first' text='Every spell' /><br /><TextReveal id='home-headline-second' text='has a story.' delay={.06} /><br /><span className="ss-home-headline-accent"><TextReveal id='home-headline-accent-copy' text='Learn its words.' delay={.12} /><svg viewBox="0 0 480 15" aria-hidden="true"><path d="M3 9Q209 0 474 8M55 14Q238 7 451 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span></h1>
            <p id="home-description" className="ss-home-description">Famous incantations, invented languages, and little words with big stories. Discover how to spell them, say them, and understand the magic behind them.</p>
            <div id="home-learning-features" className="ss-home-feature-row"><span><Icon name="letters" size={15} />Spell it</span><span><Icon name="audio" size={15} />Say it</span><span><Icon name="book" size={15} />Understand it</span></div>
            <div id="home-hero-actions" className="ss-home-actions"><AppLink id="home-explore" href="/spells" className="ss-home-primary"><Icon name="book" size={17} />Explore the spellbook<Icon name="arrow" size={16} /></AppLink><button id="home-surprise" type="button" onClick={surprise} disabled={!ready || !spells.length} className="ss-home-secondary"><Icon name="spark" size={15} />Find a spell for me</button></div>
            <form id="home-search-form" className="ss-home-search" onSubmit={(event) => { event.preventDefault(); visitSearch(); }}><Icon name="search" size={17} /><label htmlFor="home-search-input" className="ss-visually-hidden">Search spells, meanings, and worlds</label><input id="home-search-input" value={query} type="search" onChange={(event) => setQuery(event.target.value)} placeholder="Search a spell, meaning, or world…" /><button id="home-search-submit" type="submit" aria-label="Search the spellbook"><Icon name="arrow" size={17} /></button></form>
            <div id="home-world-chips" className="ss-home-world-chips"><span>Wander into</span>{worlds.map((world) => <AppLink key={world.id} id={`home-world-chip-${world.id}`} href={`/spells?world=${encodeURIComponent(world.id)}`}>{world.name}</AppLink>)}</div>
          </div>
          <div id="home-spell-stage" className="ss-home-spell-stage">
            <span id="home-stage-note" className="ss-home-stage-note" aria-hidden="true">a little light to begin<svg viewBox="0 0 80 34"><path d="M2 1Q39 3 62 29M54 27l9 3-2-9" /></svg></span>
            <HeroSpellCarousel ready={ready} spells={spells} />
            <svg id="home-stage-spark" className="ss-home-stage-spark" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 1Q22 14 35 18Q22 22 18 35Q14 22 1 18Q14 14 18 1Z" /></svg>
            <span id="home-stage-caption" className="ss-home-stage-caption"><Icon name="spark" size={15} />Every word opens a world</span>
          </div>
        </div>
        <div id="home-hero-bottom" className="ss-home-hero-bottom"><span>Books. Films. Games. Stories.</span><span><Icon name="book" size={14} />A growing collection for curious minds</span></div>
      </section>

      <section id="home-curated-section" className="ss-home-section" aria-labelledby="home-curated-title"><div className="ss-home-section-heading"><div><p className="ss-home-kicker">A few pages to begin with</p><h2 id="home-curated-title"><TextReveal id="home-curated-title-copy" text={`Small words. Extraordinary worlds.`} /></h2></div><AppLink id="home-view-catalog" href="/spells" className="ss-home-text-link">Browse all spells<Icon name="arrow" size={17} /></AppLink></div><div id="home-curated-grid" className="ss-home-curated-grid">{curated.map((spell) => <SpellCard key={spell.id} spell={spell} compact />)}</div>{!ready && <p id="home-curated-loading" className="ss-home-muted" role="status">Loading the collection…</p>}</section>

      <section id="home-worlds-section" className="ss-home-section ss-home-worlds-section" aria-labelledby="home-worlds-title"><div className="ss-home-section-heading"><div><p className="ss-home-kicker">Choose your next chapter</p><h2 id="home-worlds-title"><TextReveal id="home-worlds-title-copy" text={`Where does your magic live?`} /></h2></div><AppLink id="home-all-worlds" href="/worlds" className="ss-home-text-link">Explore story worlds<Icon name="world" size={17} /></AppLink></div><div id="home-worlds-grid" className="ss-home-worlds-grid">{worlds.map((world, index) => <AppLink key={world.id} id={`home-world-${world.id}`} className={`ss-home-world ss-home-world--${index}`} href={`/spells?world=${encodeURIComponent(world.id)}`}><svg className="ss-home-world-art" viewBox="0 0 320 150" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1"><circle cx="250" cy="75" r="56" /><circle cx="250" cy="75" r="68" strokeDasharray="2 9" /><path d={index === 0 ? `M220 130V65l13-22 13 22v65M247 130V80l12-18 12 18v50M202 130V94h84M223 73h20M253 89h14` : index === 1 ? `M173 133l32-57 22 39 23-75 41 93M224 80l14 21 12-60 16 31M205 78l7 14` : `M219 123Q182 92 218 58Q257 18 261 40Q225 64 257 80Q290 91 265 130M212 123Q210 86 236 73`} /></g></svg><span className="ss-home-world-medium"><Icon name={world.medium === `Games` ? `wand` : `book`} size={14} />{world.medium}</span><h3>{world.name}</h3><p>{world.description}</p><span className="ss-home-world-count">{spells.filter((spell) => spell.worldId === world.id).length} spells<Icon name="arrow" size={16} /></span></AppLink>)}</div></section>

      <section id="home-guide-section" className="ss-home-section ss-home-guide-section" aria-labelledby="home-guide-title"><div id="home-guide-art" className="ss-home-guide-art" aria-hidden="true"><span className="ss-home-guide-label">A word, one sound at a time</span><div className="ss-home-guide-letters">{[`L`, `U`, `M`, `O`, `S`].map((letter, index) => <span key={index} id={`home-guide-letter-${index}`}>{letter}</span>)}</div><p>LU <span>·</span> MOS</p><svg viewBox="0 0 300 62"><path d="M25 30H43M48 21v18M58 15v30M68 23v14M78 5v50M88 13v34M98 21v18M108 26v8M118 16v28M128 21v18M138 27v6M151 14v32M161 5v50M171 14v32M181 20v20M191 26v8M201 13v34M211 8v44M221 20v20M231 27v6M241 22v16M250 30h25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg><img src="/brand/logo-mark.svg" alt="" /></div><div id="home-guide-copy" className="ss-home-guide-copy"><p className="ss-home-kicker">Get to know the words</p><h2 id="home-guide-title"><TextReveal id="home-guide-title-first" text={`Read it. Say it.`} /><br /><TextReveal id="home-guide-title-second" text={`Make sense of it.`} delay={.06} /></h2><p>A spell's spelling is only the beginning. Break it into syllables, see the sound guide, and trace the words back to their story and language.</p><ul><li><Icon name="letters" size={17} /><span><strong>Every letter, in place.</strong>Clear spelling tiles and syllable breakdowns.</span></li><li><Icon name="audio" size={17} /><span><strong>A thoughtful sound guide.</strong>Source notes distinguish author guidance from reader aids.</span></li><li><Icon name="book" size={17} /><span><strong>The story behind the spell.</strong>Definitions, uses, language roots, and linked sources.</span></li></ul><AppLink id="home-pronunciation-guide" href="/pronunciation" className="ss-home-text-link">Open the pronunciation guide<Icon name="arrow" size={17} /></AppLink></div></section>

      <section id="home-ethos-section" className="ss-home-section ss-home-ethos-section" aria-labelledby="home-ethos-title"><p className="ss-home-kicker">A little curiosity goes a long way</p><h2 id="home-ethos-title"><TextReveal id="home-ethos-title-copy" text={`The magic is in understanding.`} /></h2><div className="ss-home-ethos-grid"><article id="home-ethos-sources"><Icon name="book" size={25} /><h3>Stories, with their sources.</h3><p>Follow an entry back to the creator or original world. Etymology is marked confirmed, suggested, or unconfirmed.</p></article><article id="home-ethos-context"><Icon name="shield" size={25} /><h3>Context for every incantation.</h3><p>See what a spell does and where it belongs. Danger, utility, and skill levels are editorial reading guides.</p></article><article id="home-ethos-local"><Icon name="bookmark" size={25} /><h3>Your own little spellbook.</h3><p>Sign in to save favorites in your private account collection. Browse and read freely, with no account needed.</p></article></div></section>

      <PricingPlans />

      <section id="home-final-cta" className="ss-home-section ss-home-final-cta" aria-labelledby="home-final-title"><Icon name="spark" size={26} /><p className="ss-home-kicker">One more page?</p><h2 id="home-final-title"><TextReveal id="home-final-title-first" text={`Your next favorite spell`} /><br /><TextReveal id="home-final-title-second" text={`is waiting to be discovered.`} delay={.06} /></h2><AppLink id="home-final-explore" href="/spells" className="ss-home-primary"><Icon name="book" size={17} />Open the spellbook<Icon name="arrow" size={16} /></AppLink></section>
    </div>
  );
};

export default HomePage;
