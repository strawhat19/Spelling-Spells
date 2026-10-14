import { seedSpells } from '../../src/shared/catalog/seed';
import { getSpellSlug } from '../../src/shared/catalog/routes';

export const generateStaticParams = () => seedSpells.map((spell) => ({ slug: getSpellSlug(spell) }));

export { default } from '../../src/components/SpellDetailPage';
