// Bare context + types only — no component, no hook. Living in a non-tsx file
// lets the Provider (a component) and useApp (a hook) live in separate files,
// keeping each file Fast-Refresh-friendly.

import { createContext } from 'react';
import type { Category } from '../types';

export type AmmoPopoverState = { anchorEl: HTMLElement; id: string } | null;

/** Click-popover for unit chips inside mission/campaign views. Carries the
 *  destination category (vessels/aircraft/land_units) so the popover knows
 *  which detail endpoint to hit and what kind of full page to open. */
export type UnitPopoverState =
  | { anchorEl: HTMLElement; id: string; category: Category }
  | null;

export type AppContextValue = {
  category: Category;
  setCategory: (c: Category) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  /** Count of items in the current category — set by Sidebar after fetch,
   *  read by Topbar for the header badge. Null while loading. */
  categoryCount: number | null;
  setCategoryCount: (n: number | null) => void;

  ammoNames: Record<string, string>;
  /** Pre-loaded id → localized display name across vessels / aircraft / land_units.
   *  Used by mission OOB / campaign roster chips so they show Chinese names
   *  instead of raw game ids. */
  unitNames: Record<string, string>;

  ammoPopover: AmmoPopoverState;
  openAmmoPopover: (anchorEl: HTMLElement, id: string) => void;
  closeAmmoPopover: () => void;

  unitPopover: UnitPopoverState;
  openUnitPopover: (anchorEl: HTMLElement, id: string, category: Category) => void;
  closeUnitPopover: () => void;
};

export const AppContext = createContext<AppContextValue | null>(null);
