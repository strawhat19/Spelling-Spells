import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSpells } from '../../shared/spellsContext/useSpells';

export const useHomePage = () => {
  const router = useRouter();
  const collection = useSpells();
  const [query, setQuery] = useState(``);
  const featured = collection.spells.find((spell) => spell.name === `Lumos`) ?? collection.spells[0];
  const curated = collection.spells.slice(0, 4);
  const visitSearch = () => router.push({ pathname: `/spells`, params: query.trim() ? { q: query.trim() } : {} });
  const surprise = () => {
    if (!collection.spells.length) return;
    const spell = collection.spells[Math.floor(Math.random() * collection.spells.length)];
    router.push({ pathname: `/spell`, params: { id: spell.id } });
  };
  return { ...collection, query, curated, featured, surprise, setQuery, visitSearch };
};
