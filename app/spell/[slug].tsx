import { buildCatalog } from '../../src/shared/catalog/buildSnapshot';
import { getSpellSlug } from '../../src/shared/catalog/routes';

export const generateStaticParams = () => buildCatalog.spells.map((spell) => ({ slug: getSpellSlug(spell) }));

export { default } from '../../src/components/SpellDetailPage';
