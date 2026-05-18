// Generic click-popover shell. Handles all the cross-cutting concerns shared
// by AmmoPopover and UnitPopover (and any future popovers):
//   - anchor-relative positioning (right of anchor, falls back to left/top if
//     it would clip the viewport)
//   - outside-click dismissal, with an opt-in allow-list of trigger selectors
//     so a sibling trigger can swap the open popover without racing the close
//   - Escape key dismissal
//   - corner close button (×)
//   - hidden state when no anchor is provided
//
// Callers provide only the body content + state subscription. This shrinks
// each concrete popover from ~150 lines to <50 lines and keeps positioning
// behavior consistent across all of them.

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type Props = {
  /** Element the popover anchors to. `null` means closed/hidden. */
  anchor: HTMLElement | null;
  onClose: () => void;
  /** Outer CSS class — typically picks the width / palette variant. */
  className: string;
  /** Clicks on elements matching any of these CSS selectors won't auto-close
   *  the popover. Lets the user click a different chip to open a new popover
   *  without the dismiss race firing first. Pass a module-level constant array
   *  to keep the effect deps stable across renders. */
  triggerSelectors?: string[];
  children: ReactNode;
};

export function ClickPopover({
  anchor,
  onClose,
  className,
  triggerSelectors = EMPTY,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Reposition after every paint so the popover follows its anchor size and
  // content changes (e.g. when a fetched body lands and grows the popover).
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    positionPopover(ref.current, anchor);
  }, [anchor, children]);

  // Outside-click + Esc dismissal, only attached while open.
  useEffect(() => {
    if (!anchor) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      for (const sel of triggerSelectors) {
        if (target.closest?.(sel)) return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose, triggerSelectors]);

  const visible = !!anchor;
  return (
    <div ref={ref} className={`${className}${visible ? ' visible' : ''}`}>
      {visible && (
        <button
          type="button"
          className="popover-close"
          onClick={onClose}
          aria-label="关闭"
          title="关闭 (Esc)"
        >
          ×
        </button>
      )}
      {visible && children}
    </div>
  );
}

// Module-level empty-array constant so the default value is reference-stable
// (an inline `triggerSelectors = []` default would allocate every render and
// thrash the effect's dep list).
const EMPTY: string[] = [];

function positionPopover(tip: HTMLElement, anchor: HTMLElement) {
  tip.style.left = '0px';
  tip.style.top = '0px';
  const r = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const margin = 8;
  let left = r.right + margin;
  let top = r.top;
  if (left + tw > window.innerWidth - margin) {
    left = Math.max(margin, r.left - tw - margin);
  }
  if (top + th > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - th - margin);
  }
  if (top < margin) top = margin;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
