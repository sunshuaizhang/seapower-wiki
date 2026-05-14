// Provider component that owns all app-level state. Context and types live in
// ./context.ts; the useApp() consumer hook lives in ./useApp.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getUnits } from '../api';
import type { Category } from '../types';
import { AppContext } from './context';
import type { AmmoPopoverState, AppContextValue } from './context';

export function AppProvider({ children }: { children: ReactNode }) {
  const [category, setCategoryState] = useState<Category>('vessels');
  const [lang, setLang] = useState<string>('cn');
  const [search, setSearch] = useState<string>('');
  const [filterNation, setFilterNation] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ammoNames, setAmmoNames] = useState<Record<string, string>>({});
  const [ammoPopover, setAmmoPopover] = useState<AmmoPopoverState>(null);

  // Switching category resets selection and clears filter values so a stale
  // filter from a previous category does not zero out the new list.
  const setCategory = useCallback((c: Category) => {
    setCategoryState((prev) => {
      if (prev === c) return prev;
      setSelectedId(null);
      setFilterNation('');
      setFilterType('');
      return c;
    });
  }, []);

  // Preload ammo names whenever the language changes. Failures are non-fatal —
  // weapon ammo chips just fall back to their raw id.
  useEffect(() => {
    let alive = true;
    getUnits('ammunition', lang)
      .then((list) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const a of list) if (a.id) map[a.id] = a.name ?? a.id;
        setAmmoNames(map);
      })
      .catch((e: unknown) => console.warn('ammo names preload failed', e));
    return () => {
      alive = false;
    };
  }, [lang]);

  const openAmmoPopover = useCallback((anchorEl: HTMLElement, id: string) => {
    setAmmoPopover((prev) => {
      // Click again on the currently-open link toggles closed.
      if (prev && prev.anchorEl === anchorEl && prev.id === id) return null;
      return { anchorEl, id };
    });
  }, []);

  const closeAmmoPopover = useCallback(() => setAmmoPopover(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
      category,
      setCategory,
      lang,
      setLang,
      search,
      setSearch,
      filterNation,
      setFilterNation,
      filterType,
      setFilterType,
      selectedId,
      setSelectedId,
      ammoNames,
      ammoPopover,
      openAmmoPopover,
      closeAmmoPopover,
    }),
    [
      category,
      setCategory,
      lang,
      search,
      filterNation,
      filterType,
      selectedId,
      ammoNames,
      ammoPopover,
      openAmmoPopover,
      closeAmmoPopover,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
