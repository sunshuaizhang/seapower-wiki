// Bare context + types only — no component, no hook. Living in a non-tsx file
// lets the Provider (a component) and useApp (a hook) live in separate files,
// keeping each file Fast-Refresh-friendly.

import { createContext } from 'react';
import type { Category } from '../types';

export type AmmoPopoverState = { anchorEl: HTMLElement; id: string } | null;

export type AppContextValue = {
  category: Category;
  setCategory: (c: Category) => void;

  lang: string;
  setLang: (l: string) => void;

  search: string;
  setSearch: (s: string) => void;

  filterNation: string;
  setFilterNation: (s: string) => void;

  filterType: string;
  setFilterType: (s: string) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  ammoNames: Record<string, string>;

  ammoPopover: AmmoPopoverState;
  openAmmoPopover: (anchorEl: HTMLElement, id: string) => void;
  closeAmmoPopover: () => void;
};

export const AppContext = createContext<AppContextValue | null>(null);
