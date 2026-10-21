import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { findSpellByRoute, getSpellPath } from '../../shared/catalog/routes';

const firstValue = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export const useSpellDetailPage = () => {
  const router = useRouter();
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ id?: string | string[]; slug?: string | string[] }>();
  const id = firstValue(parameters.id);
  const slug = firstValue(parameters.slug);
  const { spells, worlds } = collection;
  const spell = useMemo(() => findSpellByRoute(spells, { id, slug }), [id, slug, spells]);
  const world = useMemo(() => worlds.find((item) => item.id === spell?.worldId), [spell?.worldId, worlds]);
  const related = useMemo(() => spells.filter((item) => item.id !== spell?.id && (item.worldId === spell?.worldId || item.category === spell?.category)).slice(0, 3), [spell?.id, spell?.worldId, spell?.category, spells]);

  useEffect(() => {
    if (spell && id && !slug) router.replace(getSpellPath(spell));
  }, [id, slug, spell, router]);

  useEffect(() => {
    if (collection.ready && spell) void collection.recordViewed(spell.id);
  }, [spell?.id, collection.ready, collection.recordViewed]);

  return { ...collection, id, spell, world, spells, related };
};
