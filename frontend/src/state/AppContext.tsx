// Provider component that owns all app-level state. Context and types live in
// ./context.ts; the useApp() consumer hook lives in ./useApp.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getUnits } from '../api';
import type { Category } from '../types';
import { buildHash, parseHash } from '../utils/url';
import { AppContext } from './context';
import type {
  AmmoPopoverState,
  AppContextValue,
  UnitPopoverState,
} from './context';

export function AppProvider({ children }: { children: ReactNode }) {
  // Seed (category, selectedId) from the URL hash so deep links / new-window
  // "打开完整页" land on the right detail on first paint with no flash.
  // Lazy initializers — parseHash runs once on mount instead of every render.
  const [category, setCategoryState] = useState<Category>(
    () => parseHash(typeof window !== 'undefined' ? window.location.hash : '')?.category ?? 'vessels',
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => parseHash(typeof window !== 'undefined' ? window.location.hash : '')?.selectedId ?? null,
  );
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [ammoNames, setAmmoNames] = useState<Record<string, string>>({});
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  const [ammoPopover, setAmmoPopover] = useState<AmmoPopoverState>(null);
  const [unitPopover, setUnitPopover] = useState<UnitPopoverState>(null);

  // Side effects (clearing selection / count) are dispatched alongside the
  // category change, not nested inside its updater function — nested dispatches
  // race against any setSelectedId(...) called by the same event handler (the
  // "open full page" flow does exactly that). We read the current category via
  // a ref so the callback stays stable; the ref is synced in an effect, not
  // during render, per the react-hooks rule.
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);
  const setCategory = useCallback((c: Category) => {
    if (categoryRef.current === c) return;
    setCategoryState(c);
    setSelectedId(null);
    setCategoryCount(null);
  }, []);

  // Preload ammo-id → display-name lookup once at startup. Used by AmmoLink in
  // weapon rows so each chip shows the human name (not the raw slug). Failures
  // are non-fatal — links fall back to the raw id.
  useEffect(() => {
    let alive = true;
    getUnits('ammunition')
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
  }, []);

  // Same preload for unit ids → localized names (vessels + aircraft + land units).
  // Mission OOB + campaign roster chips look up here so they show "提康德罗加" instead
  // of "usn_cg_ticonderoga". Three categories so one big merged map keyed by id.
  useEffect(() => {
    let alive = true;
    Promise.all([getUnits('vessels'), getUnits('aircraft'), getUnits('land_units')])
      .then((lists) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const list of lists) {
          for (const u of list) if (u.id) map[u.id] = u.name ?? u.id;
        }
        setUnitNames(map);
      })
      .catch((e: unknown) => console.warn('unit names preload failed', e));
    return () => {
      alive = false;
    };
  }, []);

  const openAmmoPopover = useCallback((anchorEl: HTMLElement, id: string) => {
    setAmmoPopover((prev) => {
      // Click again on the currently-open link toggles closed.
      if (prev && prev.anchorEl === anchorEl && prev.id === id) return null;
      return { anchorEl, id };
    });
  }, []);

  const closeAmmoPopover = useCallback(() => setAmmoPopover(null), []);

  // Two-way URL hash sync.
  //  - Write: whenever (category, selectedId) change, push the matching hash
  //    via replaceState so navigation back/forward isn't littered with every
  //    click. replaceState also does NOT fire hashchange, so no feedback loop.
  //  - Read: listen to hashchange (browser back/forward, manual address-bar
  //    edits) and update state to match.
  useEffect(() => {
    const desired = buildHash(category, selectedId);
    if (window.location.hash !== desired) {
      window.history.replaceState(null, '', desired);
    }
  }, [category, selectedId]);
  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash(window.location.hash);
      if (parsed) {
        if (parsed.category !== categoryRef.current) {
          setCategoryState(parsed.category);
          setCategoryCount(null);
        }
        setSelectedId(parsed.selectedId);
      } else {
        setSelectedId(null);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openUnitPopover = useCallback(
    (anchorEl: HTMLElement, id: string, cat: import('../types').Category) => {
      setUnitPopover((prev) => {
        if (prev && prev.anchorEl === anchorEl && prev.id === id) return null;
        return { anchorEl, id, category: cat };
      });
    },
    [],
  );
  const closeUnitPopover = useCallback(() => setUnitPopover(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
      category,
      setCategory,
      selectedId,
      setSelectedId,
      categoryCount,
      setCategoryCount,
      ammoNames,
      unitNames,
      ammoPopover,
      openAmmoPopover,
      closeAmmoPopover,
      unitPopover,
      openUnitPopover,
      closeUnitPopover,
    }),
    [
      category,
      setCategory,
      selectedId,
      categoryCount,
      ammoNames,
      unitNames,
      ammoPopover,
      openAmmoPopover,
      closeAmmoPopover,
      unitPopover,
      openUnitPopover,
      closeUnitPopover,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
