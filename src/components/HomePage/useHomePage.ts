import { useState } from 'react';
import { useRouter } from 'expo-router';
import { getSpellPath } from '../../shared/catalog/routes';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { announcePageNavigation } from '../../shared/navigation';

export const useHomePage = () => {
  const router = useRouter();
  const collection = useSpells();
  const [query, setQuery] = useState(``);
  const featured = collection.spells.find((spell) => spell.name === `Lumos`) ?? collection.spells[0];
  const curated = collection.spells.slice(0, 4);
  const visitSearch = () => {
    announcePageNavigation(query.trim() ? `/spells?q=${encodeURIComponent(query.trim())}` : `/spells`);
    router.push({ pathname: `/spells`, params: query.trim() ? { q: query.trim() } : {} });
  };
  const surprise = () => {
    if (!collection.spells.length) return;
    const spell = collection.spells[Math.floor(Math.random() * collection.spells.length)];
    const destination = getSpellPath(spell);
    announcePageNavigation(destination);
    router.push(destination);
  };
  return { ...collection, query, curated, featured, surprise, setQuery, visitSearch };
};
