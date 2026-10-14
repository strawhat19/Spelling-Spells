import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSpells } from '../../shared/spellsContext/useSpells';

export type CatalogSort = `catalog` | `recent` | `name` | `world`;

const firstValue = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? `` : value ?? ``;
const searchable = (value: string) => value.normalize(`NFKD`).replace(/[\u0300-\u036f]/g, ``).toLowerCase();

export const useCatalogPage = (savedOnly = false) => {
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ q?: string | string[]; world?: string | string[]; skill?: string | string[]; category?: string | string[] }>();
  const [query, setQuery] = useState(firstValue(parameters.q));
  const [skill, setSkill] = useState(firstValue(parameters.skill));
  const [world, setWorld] = useState(firstValue(parameters.world));
  const [category, setCategory] = useState(firstValue(parameters.category));
  const [savedFilter, setSavedFilter] = useState(savedOnly);
  const [sort, setSort] = useState<CatalogSort>(savedOnly ? `recent` : `catalog`);

  useEffect(() => {
    setQuery(firstValue(parameters.q));
    setSkill(firstValue(parameters.skill));
    setWorld(firstValue(parameters.world));
    setCategory(firstValue(parameters.category));
  }, [parameters.q, parameters.skill, parameters.world, parameters.category]);

  useEffect(() => {
    setSavedFilter(savedOnly);
    setSort(savedOnly ? `recent` : `catalog`);
  }, [savedOnly]);

  const savedSpells = useMemo(() => collection.spells.filter((spell) => collection.savedIds.includes(spell.id)), [collection.spells, collection.savedIds]);
  const shelfWorlds = useMemo(() => collection.worlds.filter((item) => savedSpells.some((spell) => spell.worldId === item.id)), [savedSpells, collection.worlds]);
  const source = savedOnly ? savedSpells : collection.spells;
  const categories = useMemo(() => [...new Set(source.map((spell) => spell.category))].sort(), [source]);
  const results = useMemo(() => {
    const search = searchable(query.trim());
    const matching = source.filter((spell) => {
      const sourceWorld = collection.worlds.find((item) => item.id === spell.worldId);
      const text = searchable([spell.name, spell.definition, spell.language, spell.sourceTitle, sourceWorld?.name, spell.category, ...spell.aliases].join(` `));
      return (!search || text.includes(search))
        && (!skill || spell.skill === skill)
        && (!world || spell.worldId === world)
        && (!category || spell.category === category)
        && (!savedFilter || collection.savedIds.includes(spell.id));
    });
    return matching.sort((left, right) => {
      if (sort === `name`) return left.name.localeCompare(right.name);
      if (sort === `recent`) return collection.savedIds.indexOf(right.id) - collection.savedIds.indexOf(left.id);
      if (sort === `world`) {
        const leftWorld = collection.worlds.find((item) => item.id === left.worldId)?.name ?? left.sourceTitle;
        const rightWorld = collection.worlds.find((item) => item.id === right.worldId)?.name ?? right.sourceTitle;
        return leftWorld.localeCompare(rightWorld) || left.name.localeCompare(right.name);
      }
      return left.number - right.number;
    });
  }, [query, skill, world, category, sort, source, savedFilter, collection.worlds, collection.savedIds]);

  const clearFilters = () => {
    setQuery(``);
    setSkill(``);
    setWorld(``);
    setCategory(``);
    setSavedFilter(savedOnly);
  };

  return {
    ...collection,
    sort,
    query,
    skill,
    world,
    results,
    setSort,
    category,
    setQuery,
    setSkill,
    setWorld,
    categories,
    savedFilter,
    savedSpells,
    shelfWorlds,
    setCategory,
    clearFilters,
    setSavedFilter,
    savedCount: collection.savedIds.length,
    unavailableCount: collection.savedIds.length - savedSpells.length,
    filtered: Boolean(query.trim() || skill || world || category || (!savedOnly && savedFilter)),
  };
};
