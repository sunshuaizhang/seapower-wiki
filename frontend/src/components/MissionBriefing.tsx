// Renders the parsed XAML briefing as a CSS grid that mirrors the game's WPF
// layout — left column for headers ("发件:" / "收件:" / "主题:"), right column
// for content, spacer rows between message blocks. Cells use `grid-row` and
// `grid-column` with the span values from the source.
//
// Track sizing maps XAML → CSS:
//   "Auto"     → auto
//   "*"        → 1fr
//   "<number>" → <number>px
//
// FontSize tokens (StaticResource keys like "Header" / "Body") are not
// resolved here — they become class hooks so CSS can give them a size.

import type { Briefing, BriefingCell } from '../types';

export function MissionBriefing({ briefing }: { briefing: Briefing }) {
  const rows = briefing.rowTracks.map(track).join(' ');
  const cols = briefing.colTracks.map(track).join(' ');

  return (
    <div className="briefing-paper">
      <div
        className="briefing-grid"
        style={{ gridTemplateRows: rows, gridTemplateColumns: cols }}
      >
        {briefing.cells.map((c, i) => (
          <CellView key={i} cell={c} />
        ))}
      </div>
    </div>
  );
}

function CellView({ cell }: { cell: BriefingCell }) {
  const style: React.CSSProperties = {
    gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
    gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
    justifySelf: align(cell.hAlign),
    alignSelf: align(cell.vAlign),
  };
  const classes = ['briefing-cell'];
  if (cell.fontSize) classes.push(`fs-${cell.fontSize.toLowerCase()}`);
  if (cell.wrap) classes.push('wrap');
  if (cell.isImage) classes.push('is-image');
  // Briefing image bindings reference Unity assets we can't easily resolve —
  // show a small placeholder block so the grid spacing still reads correctly.
  if (cell.isImage) {
    return (
      <div className={classes.join(' ')} style={style} title={cell.imageBinding ?? ''}>
        <span className="briefing-img-placeholder">[ 简报图像 ]</span>
      </div>
    );
  }
  return (
    <div className={classes.join(' ')} style={style}>
      {cell.text.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

function track(t: string): string {
  const v = t.trim();
  if (v === 'Auto') return 'auto';
  if (v === '*') return '1fr';
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return 'auto';
}

function align(value: string | null): React.CSSProperties['justifySelf'] {
  switch (value) {
    case 'Left':    return 'start';
    case 'Right':   return 'end';
    case 'Center':  return 'center';
    case 'Stretch': return 'stretch';
    default:        return undefined;
  }
}
