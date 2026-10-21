import { useLocalSearchParams } from 'expo-router';
import { getWorldSlug } from '../../shared/catalog/metadata';
import { useSpells } from '../../shared/spellsContext/useSpells';

export const useWorldDetailPage = () => {
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(parameters.slug) ? parameters.slug?.[0] : parameters.slug;
  const world = collection.worlds.find((item) => getWorldSlug(item) === slug);
  return { ...collection, world, entries: collection.spells.filter((spell) => spell.worldId === world?.id) };
};
