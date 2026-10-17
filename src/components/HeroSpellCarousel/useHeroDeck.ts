import type { Spell } from '../../shared/models/Spell';
import { useMemo, useState, useEffect, useCallback } from 'react';

export const getHeroDeck = (spells: Spell[]): Spell[] => {
  const first = spells.find((spell) => spell.name === `Lumos`);
  const ordered = first ? [first, ...spells] : spells;
  const seen = new Set<string>();
  const deck: Spell[] = [];
  for (const spell of ordered) {
    if (seen.has(spell.id)) continue;
    seen.add(spell.id);
    deck.push(spell);
    if (deck.length === 5) break;
  }
  return deck;
};

const wrapIndex = (index: number, count: number): number => count ? ((index % count) + count) % count : 0;
const selectedIndex = (deck: Spell[], id: string | null): number => Math.max(0, deck.findIndex((spell) => spell.id === id));

export const useHeroDeck = (spells: Spell[]) => {
  const deck = useMemo(() => getHeroDeck(spells), [spells]);
  const [selectedId, setSelectedId] = useState<string | null>(() => deck[0]?.id ?? null);
  const count = deck.length;
  const index = selectedIndex(deck, selectedId);
  const current = deck[index] ?? null;

  useEffect(() => {
    if (!deck.some((spell) => spell.id === selectedId)) setSelectedId(deck[0]?.id ?? null);
  }, [deck, selectedId]);

  const select = useCallback((nextIndex: number) => {
    if (!Number.isFinite(nextIndex)) return;
    setSelectedId(deck[wrapIndex(Math.trunc(nextIndex), count)]?.id ?? null);
  }, [deck, count]);
  const move = useCallback((direction: -1 | 1) => {
    setSelectedId((previousId) => deck[wrapIndex(selectedIndex(deck, previousId) + direction, count)]?.id ?? null);
  }, [deck, count]);
  const next = useCallback(() => move(1), [move]);
  const previous = useCallback(() => move(-1), [move]);

  return { deck, count, index, current, select, next, previous };
};
