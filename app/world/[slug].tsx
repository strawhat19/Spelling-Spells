import { buildCatalog } from '../../src/shared/catalog/buildSnapshot';
import { getWorldSlug } from '../../src/shared/catalog/metadata';

export const generateStaticParams = () => buildCatalog.worlds.map((world) => ({ slug: getWorldSlug(world) }));
export { default } from '../../src/components/WorldDetailPage';
