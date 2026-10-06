import { useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSpells } from '../../shared/spellsContext/useSpells';

export const useSpellDetailPage = () => {
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(parameters.id) ? parameters.id[0] : parameters.id;
  const spell = useMemo(() => collection.spells.find((item) => item.id === id), [id, collection.spells]);
  const world = useMemo(() => collection.worlds.find((item) => item.id === spell?.worldId), [spell?.worldId, collection.worlds]);
  const related = useMemo(() => collection.spells.filter((item) => item.id !== spell?.id && (item.worldId === spell?.worldId || item.category === spell?.category)).slice(0, 3), [spell?.id, spell?.worldId, spell?.category, collection.spells]);

  useEffect(() => {
    if (collection.ready && spell) void collection.recordViewed(spell.id);
  }, [spell?.id, collection.ready, collection.recordViewed]);

  return { ...collection, id, spell, world, related };
};
