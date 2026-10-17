import './styles.scss';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import SpellCard from '../SpellCard';
import type { HeroSpellCarouselProps } from './types';
import { useHeroCarousel } from './useHeroCarousel.web';
import FeaturedSkeleton from '../HomePage/FeaturedSkeleton';

const HeroSpellCarousel = ({ ready, spells }: HeroSpellCarouselProps) => {
  const carousel = useHeroCarousel(spells, ready);
  const { deck, count, current, index, shuffle, turning } = carousel;
  const stackIndex = shuffle ? deck.findIndex((spell) => spell.id === shuffle.target) : index;

  return <section
    id='hero-spell-carousel'
    ref={carousel.rootRef}
    className='hero-spell-carousel'
    aria-roledescription='carousel'
    aria-label='Featured Spells'
    aria-describedby='hero-carousel-help'
    tabIndex={count > 1 ? 0 : undefined}
    onKeyDown={carousel.onKeyDown}
  >
    <div
      id='hero-carousel-deck'
      ref={carousel.viewportRef}
      className='hero-carousel-deck'
      onPointerUp={carousel.onPointerUp}
      onPointerDown={carousel.onPointerDown}
      onPointerCancel={carousel.onPointerCancel}
      onClickCapture={carousel.onClickCapture}
    >
      {!ready ? [0, 1].map((position) => <div key={position} id={`home-behind-skeleton-${position}`} className={`ss-home-behind-card ss-home-behind-card--${position}`} aria-hidden='true' />) : null}
      <div id='home-featured-card' className='ss-home-featured-card hero-carousel-slides'>
        {!ready ? <FeaturedSkeleton /> : current ? deck.map((spell, position) => <div
          key={spell.id}
          role='group'
          aria-roledescription='slide'
          id={`hero-carousel-slide-${spell.id}`}
          aria-label={`${position + 1} of ${count}: ${spell.name}`}
          aria-hidden={position !== index}
          inert={position !== index || turning}
          className={`hero-carousel-slide${position === index ? ` is-active` : ``}${(position - stackIndex + count) % count === 1 ? ` is-stack-near` : ``}${(position - stackIndex + count) % count === 2 ? ` is-stack-far` : ``}${spell.id === shuffle?.source ? ` is-shuffle-source` : ``}${spell.id === shuffle?.target ? ` is-shuffle-target` : ``}`}
          ref={(element) => { if (element) carousel.panels.current.set(spell.id, element); else carousel.panels.current.delete(spell.id); }}
        >
          <SpellCard spell={spell} featured />
          <div id={`hero-carousel-cover-${spell.id}`} className='hero-carousel-card-cover' aria-hidden='true'>
            <span id={`hero-carousel-cover-origin-${spell.id}`}><Icon name={spell.accent} size={19} />{spell.sourceTitle}</span>
            <strong id={`hero-carousel-cover-name-${spell.id}`}>{spell.name}</strong>
            <p id={`hero-carousel-cover-pronunciation-${spell.id}`}>{spell.pronunciation}</p>
          </div>
        </div>) : <div id='home-featured-empty' className='ss-home-featured-loading' role='status'><Icon name='book' size={28} />Your spell library is empty</div>}
      </div>
    </div>
    {!ready ? <div id='hero-carousel-navigation-skeleton' className='hero-carousel-navigation' aria-hidden='true'>
      <div id='hero-carousel-controls-skeleton' className='hero-carousel-controls'>
        <Skeleton id='hero-carousel-previous-skeleton' shape='circle' className='hero-carousel-control' width={44} height={44} />
        <span id='hero-carousel-counter-skeleton' className='hero-carousel-counter'><Skeleton width={44} height={12} /></span>
        <Skeleton id='hero-carousel-next-skeleton' shape='circle' className='hero-carousel-control' width={44} height={44} />
      </div>
      <div id='hero-carousel-pagination-skeleton' className='hero-carousel-pagination'>
        {[0, 1, 2, 3, 4].map((position) => <span key={position} id={`hero-carousel-page-skeleton-${position}`} className='hero-carousel-page'><Skeleton shape='circle' width={6} height={6} /></span>)}
      </div>
      <p id='hero-carousel-help-skeleton' className='hero-carousel-help'><Skeleton width='76%' height={10} /></p>
    </div> : count > 1 ? <div id='hero-carousel-navigation' className='hero-carousel-navigation'>
      <div id='hero-carousel-controls' className='hero-carousel-controls'>
        <button id='hero-carousel-previous' type='button' className='hero-carousel-control' aria-label='Previous Spell' aria-controls='home-featured-card' aria-disabled={turning} onClick={() => carousel.goTo(index - 1)}><Icon name='chevron-left' size={20} /></button>
        <span id='hero-carousel-counter' className='hero-carousel-counter'>{String(index + 1).padStart(2, `0`)} <span>/ {String(count).padStart(2, `0`)}</span></span>
        <button id='hero-carousel-next' type='button' className='hero-carousel-control' aria-label='Next Spell' aria-controls='home-featured-card' aria-disabled={turning} onClick={() => carousel.goTo(index + 1)}><Icon name='chevron-right' size={20} /></button>
      </div>
      <div id='hero-carousel-pagination' className='hero-carousel-pagination' role='group' aria-label='Choose a Featured Spell'>
        {deck.map((spell, position) => <button key={spell.id} id={`hero-carousel-page-${spell.id}`} type='button' className={`hero-carousel-page${position === index ? ` is-active` : ``}`} aria-current={position === index ? `true` : undefined} aria-label={`Show ${spell.name}, Spell ${position + 1} of ${count}`} aria-controls={`hero-carousel-slide-${spell.id}`} aria-disabled={turning} title={spell.name} onClick={() => carousel.goTo(position)}><span aria-hidden='true' /></button>)}
      </div>
      <p id='hero-carousel-help' className='hero-carousel-help'>Swipe or use the arrows to shuffle the deck</p>
    </div> : null}
    {(!ready || count <= 1) && <span id='hero-carousel-help' className='sr-only'>Featured spell from the archive</span>}
    <span id='hero-carousel-announcement' className='sr-only' role='status' aria-live='polite' aria-atomic='true'>{carousel.announcement}</span>
  </section>;
};

export default HeroSpellCarousel;
