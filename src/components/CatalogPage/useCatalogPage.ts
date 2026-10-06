import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSpells } from '../../shared/spellsContext/useSpells';

const firstValue = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? `` : value ?? ``;

export const useCatalogPage = (savedOnly = false) => {
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ q?: string | string[]; world?: string | string[]; skill?: string | string[]; category?: string | string[] }>();
  const [query, setQuery] = useState(firstValue(parameters.q));
  const [skill, setSkill] = useState(firstValue(parameters.skill));
  const [world, setWorld] = useState(firstValue(parameters.world));
  const [category, setCategory] = useState(firstValue(parameters.category));
  const [savedFilter, setSavedFilter] = useState(savedOnly);

  useEffect(() => {
    setQuery(firstValue(parameters.q));
    setSkill(firstValue(parameters.skill));
    setWorld(firstValue(parameters.world));
    setCategory(firstValue(parameters.category));
  }, [parameters.q, parameters.skill, parameters.world, parameters.category]);

  useEffect(() => setSavedFilter(savedOnly), [savedOnly]);

  const categories = useMemo(() => [...new Set(collection.spells.map((spell) => spell.category))].sort(), [collection.spells]);
  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return collection.spells.filter((spell) => {
      const sourceWorld = collection.worlds.find((item) => item.id === spell.worldId);
      const text = [spell.name, spell.definition, spell.language, spell.sourceTitle, sourceWorld?.name, ...spell.aliases].join(` `).toLowerCase();
      return (!search || text.includes(search))
        && (!skill || spell.skill === skill)
        && (!world || spell.worldId === world)
        && (!category || spell.category === category)
        && (!(savedOnly || savedFilter) || collection.savedIds.includes(spell.id));
    });
  }, [query, skill, world, category, savedOnly, savedFilter, collection.spells, collection.worlds, collection.savedIds]);

  const clearFilters = () => {
    setQuery(``);
    setSkill(``);
    setWorld(``);
    setCategory(``);
    setSavedFilter(savedOnly);
  };

  return { ...collection, query, skill, world, category, results, categories, savedFilter, setQuery, setSkill, setWorld, setCategory, clearFilters, setSavedFilter };
};
