import { useMemo, useState } from 'react';
import { useSpells } from '../../shared/spellsContext/useSpells';

export const usePronunciationPage = () => {
  const collection = useSpells();
  const [query, setQuery] = useState(``);
  const [selectedId, setSelectedId] = useState(``);
  const results = useMemo(() => collection.spells.filter((spell) => `${spell.name} ${spell.language} ${spell.sourceTitle}`.toLowerCase().includes(query.trim().toLowerCase())), [query, collection.spells]);
  const selected = collection.spells.find((spell) => spell.id === selectedId) ?? results[0];
  return { ...collection, query, results, selected, selectedId, setQuery, setSelectedId };
};
