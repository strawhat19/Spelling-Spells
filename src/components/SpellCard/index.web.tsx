import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import SpellMedia from '../SpellMedia';
import type { Spell } from '../../shared/models/Spell';
import { getSpellPath } from '../../shared/catalog/routes';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { getSavedCollectionPresentation } from '../CatalogPage/savedCollectionPresentation';

type SpellCardProps = { spell: Spell; compact?: boolean; featured?: boolean };

export const SpellCard = ({ spell, compact = false, featured = false }: SpellCardProps) => {
  const collection = useSpells();
  const { worlds, isSaved, toggleSaved } = collection;
  const presentation = getSavedCollectionPresentation(collection);
  const saved = isSaved(spell.id);
  const world = worlds.find((item) => item.id === spell.worldId);
  const prefix = `spell-card-${featured ? `hero` : compact ? `curated` : `catalog`}-${spell.id}`;
  const destination = getSpellPath(spell);

  return (
    <article
      id={prefix}
      className={`spell-card${compact ? ` spell-card--compact` : ``}${featured ? ` spell-card--featured` : ``} spell-card--${spell.accent}`}
      aria-labelledby={`${prefix}-title`}
    >
      <div className="spell-card-topline" id={`${prefix}-topline`}>
        <span className="spell-card-label" id={`${prefix}-label`}><Icon name={featured ? `book` : spell.accent} size={15} />{featured ? `Inside the spellbook` : spell.category}</span>
        <button
          type="button"
          disabled={!presentation.canSave}
          aria-pressed={saved}
          id={`${prefix}-save`}
          className={`spell-card-save${saved ? ` is-saved` : ``}`}
          title={presentation.saveLabel(saved)}
          aria-label={presentation.requiresSignIn ? `Sign In To Save ${spell.name}` : presentation.canSave ? `${saved ? `Remove` : `Save`} ${spell.name} ${saved ? `from` : `to`} ${presentation.destination}` : `${presentation.blockedLabel}: ${spell.name}`}
          onClick={() => void toggleSaved(spell.id)}
        ><Icon name="bookmark" size={17} /></button>
      </div>
      <p className="spell-card-origin" id={`${prefix}-origin`}><span className="spell-card-origin-dot" aria-hidden="true" />{world?.name ?? spell.sourceTitle}{featured && <span className="spell-card-kind"> · {spell.kind}</span>}</p>
      <h3 className="spell-card-title" id={`${prefix}-title`}><AppLink id={`${prefix}-name-link`} href={destination}>{spell.name}</AppLink></h3>
      <p className="spell-card-pronunciation" id={`${prefix}-pronunciation`}><Icon name="audio" size={14} />{spell.pronunciation}</p>
      <p className="spell-card-definition" id={`${prefix}-definition`}>{spell.definition}</p>
      <SpellMedia spell={spell} idPrefix={prefix} compact />
      {featured && (
        <>
          <div className="spell-card-spelling" id={`${prefix}-spelling`}>
            <p className="spell-card-field-label">Every letter matters</p>
            <div className="spell-card-letters" aria-label={`${spell.name} spelled ${[...spell.name.toUpperCase()].join(` `)}`}>
              {[...spell.name.toUpperCase()].map((letter, index) => <span key={`${spell.id}-${index}`} id={`${prefix}-letter-${index}`} className={`spell-card-letter${letter === ` ` ? ` is-space` : ``}`} aria-hidden="true">{letter}</span>)}
            </div>
            <p className="spell-card-root"><Icon name="spark" size={15} /><span><strong>{spell.etymologyStatus === `Suggested` ? `Suggested etymology` : `A word with roots`}</strong>{spell.etymology}</span></p>
          </div>
          <div className="spell-card-ratings" id={`${prefix}-ratings`}>
            {[[`danger`, `Danger`, `${spell.danger}/5`, spell.danger], [`utility`, `Utility`, `${spell.utility}/5`, spell.utility], [`skill`, `Skill`, spell.skill, spell.skill === `Beginner` ? 1 : spell.skill === `Intermediate` ? 3 : 5]].map(([key, label, value, score]) => <div key={key} id={`${prefix}-rating-${key}`} className="spell-card-rating"><span className="spell-card-rating-label"><Icon name={key === `danger` ? `shield` : key === `utility` ? `spark` : `wand`} size={12} />{label}</span><strong>{value}</strong><div className="spell-card-rating-bars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} id={`${prefix}-rating-${key}-${index}`} className={index < Number(score) ? `is-active` : ``} />)}</div></div>)}
          </div>
          <p className="spell-card-editorial">Fictional effects · levels are editorial</p>
        </>
      )}
      <AppLink id={`${prefix}-open`} href={destination} className="spell-card-open">{featured ? `Open the spell's story` : `Open spell`}<Icon name="arrow" size={16} /></AppLink>
    </article>
  );
};

export default SpellCard;
