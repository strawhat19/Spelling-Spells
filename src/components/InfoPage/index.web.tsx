import './styles.scss';
import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import { informationPages, type InfoKind } from './content';

const InfoPage = ({ kind }: { kind: InfoKind }) => {
  const content = informationPages[kind];
  return (
    <article id={`info-page-${kind}`} className={`ss-info ss-info--${kind}`} aria-labelledby={`info-page-${kind}-title`}><header id={`info-page-${kind}-heading`} className="ss-info-heading"><span className="ss-info-emblem"><Icon name={content.icon} size={26} /></span><p className="ss-info-kicker">{content.kicker}</p><h1 id={`info-page-${kind}-title`}>{content.title}</h1><p className="ss-info-intro">{content.intro}</p></header><div id={`info-page-${kind}-sections`} className="ss-info-sections">{content.sections.map((section, index) => <section key={section.title} id={`info-page-${kind}-section-${index}`} aria-labelledby={`info-page-${kind}-section-${index}-title`}><h2 id={`info-page-${kind}-section-${index}-title`}><span aria-hidden="true">{String(index + 1).padStart(2, `0`)}</span>{section.title}</h2><p>{section.body}</p></section>)}</div><div id={`info-page-${kind}-actions`} className="ss-info-actions">{kind === `contact` ? <a id="info-contact-piratechs" className="ss-info-primary" href="https://piratechs.com/" target="_blank" rel="noreferrer"><Icon name="external-link" size={17} />Visit Piratechs</a> : <AppLink id={`info-${kind}-browse`} className="ss-info-primary" href="/spells"><Icon name="book" size={17} />Explore the spellbook<Icon name="arrow" size={16} /></AppLink>}{kind === `privacy` && <AppLink id="info-privacy-saved" className="ss-info-secondary" href="/saved"><Icon name="bookmark" size={16} />Manage saved spells</AppLink>}{(kind === `terms` || kind === `privacy`) && <AppLink id={`info-${kind}-contact`} className="ss-info-secondary" href="/contact">Contact<Icon name="arrow" size={15} /></AppLink>}{kind === `about` && <a id="info-about-piratechs" className="ss-info-secondary" href="https://piratechs.com/" target="_blank" rel="noreferrer">Meet Piratechs<Icon name="external-link" size={15} /></a>}</div><nav id={`info-page-${kind}-navigation`} className="ss-info-navigation" aria-label="Information Pages">{([`about`, `terms`, `contact`, `privacy`] as const).filter((page) => page !== kind).map((page) => <AppLink key={page} id={`info-${kind}-link-${page}`} href={`/${page}`}>{page === `privacy` ? `Privacy Policy` : page[0].toUpperCase() + page.slice(1)}</AppLink>)}</nav></article>
  );
};

export default InfoPage;
