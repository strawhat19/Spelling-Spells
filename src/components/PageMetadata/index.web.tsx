import Head from 'expo-router/head';
import { getPublicPageUrl } from './urls';
import type { PageMetadataProps } from './types';

const PageMetadata = ({ title, description, canonicalPath, noIndex = false }: PageMetadataProps) => {
  const pageTitle = `${title} · Spelling Spells`;
  const publicUrl = canonicalPath ? getPublicPageUrl(canonicalPath) : undefined;
  const imageUrl = getPublicPageUrl(`/icons/icon-512.png`);
  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? `noindex, follow` : `index, follow`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="Spelling Spells" />
      {imageUrl && <meta property='og:image' content={imageUrl} />}
      {imageUrl && <meta property='og:image:alt' content='Spelling Spells archive emblem' />}
      {imageUrl && <meta name='twitter:image' content={imageUrl} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {canonicalPath && <link rel="canonical" href={publicUrl ?? canonicalPath} />}
      {publicUrl && <meta property="og:url" content={publicUrl} />}
    </Head>
  );
};

export default PageMetadata;
