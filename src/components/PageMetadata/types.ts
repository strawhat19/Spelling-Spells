export type PageMetadataProps = {
  title: string;
  noIndex?: boolean;
  description: string;
  canonicalPath?: string;
  structuredData?: Record<string, unknown>;
};
