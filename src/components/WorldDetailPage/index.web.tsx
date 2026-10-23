import { Icon } from '../Icon';
import { AppLink } from '../AppLink';
import { SpellCard } from '../SpellCard';
import PageMetadata from '../PageMetadata';
import { useWorldDetailPage } from './useWorldDetailPage';
import { getWorldPath } from '../../shared/catalog/metadata';
import { getPublicPageUrl } from '../PageMetadata/urls';
import './styles.scss';

const WorldDetailPage = () => {
  const { ready, world, entries, catalogError, reloadCatalog } = useWorldDetailPage();
  if (catalogError) return <section id='world-detail-error' className='ss-world-detail' role='alert'><PageMetadata noIndex title='Universe Unavailable' description='The published universe could not be loaded' /><h1>Cannot open this universe</h1><p>{catalogError}</p><button id='world-detail-retry' className='secondary-button' onClick={reloadCatalog}><Icon name='refresh' size={16} />Try Again</button></section>;
  if (!ready && !world) return <section id='world-detail-loading' className='ss-world-detail' role='status'><PageMetadata noIndex title={`Opening Universe`} description={`The requested universe is being checked against the published archive.`} />Opening this universe…</section>;
  if (!world) return <section id='world-detail-missing' className='ss-world-detail'><PageMetadata noIndex title='Universe Not Found' description='This universe has no published entries in the archive' /><h1>Universe not found</h1><p>It may be unpublished or the link may be incomplete.</p><AppLink id='world-detail-browse' href='/worlds'><Icon name='world' size={16} />Browse Universes</AppLink></section>;
  const canonicalPath = getWorldPath(world);
  return (
    <section id={`world-detail-${world.id}`} className='ss-world-detail' aria-labelledby='world-detail-title'>
      <PageMetadata title={world.name} description={world.description} canonicalPath={canonicalPath} structuredData={{ '@context': `https://schema.org`, '@type': `CollectionPage`, name: world.name, description: world.description, url: getPublicPageUrl(canonicalPath), hasPart: entries.map((spell) => ({ '@type': `CreativeWork`, name: spell.name, description: spell.definition })) }} />
      <AppLink id='world-detail-back' href='/worlds'><Icon name='chevron-left' size={16} />All Universes</AppLink>
      <header id='world-detail-heading'><p className='ss-world-detail-kind'>{world.kind === `folklore` ? `Folklore Tradition` : `Fictional Universe`} · {world.medium}</p><h1 id='world-detail-title'>{world.name}</h1><p>{world.description}</p>{world.continuity && <p id='world-detail-continuity'>{world.continuity}</p>}{world.kind === `folklore` && <p id='world-detail-belief-note'>These records describe cultural beliefs and traditions, not proven supernatural effects.</p>}</header>
      <div id='world-detail-entries' className='ss-world-detail-entries'>{entries.map((spell) => <SpellCard key={spell.id} spell={spell} compact />)}</div>
      <AppLink id='world-detail-filter' className='secondary-button' href={`/spells?world=${encodeURIComponent(world.id)}`}><Icon name='search' size={16} />Search This Universe</AppLink>
    </section>
  );
};

export default WorldDetailPage;
