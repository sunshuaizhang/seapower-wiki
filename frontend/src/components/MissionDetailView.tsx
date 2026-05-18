// Detail layout for a single mission: hero (briefing map + identity), stats
// strip, description, objectives, OOB, XAML briefing, environment dump.

import { assetUrl } from '../api';
import type { MissionDetail } from '../types';
import { useImageLoadState } from '../utils/useImageLoadState';
import { difficultyStars } from '../utils/difficulty';
import { Difficulty } from './Difficulty';
import { MissionBriefing } from './MissionBriefing';
import { OrderOfBattle } from './OrderOfBattle';
import { Section } from './Section';
import { StatsStrip } from './StatsStrip';
import type { Stat } from './StatsStrip';

export function MissionDetailView({ m }: { m: MissionDetail }) {
  const stats = pickStats(m);
  const hasObjectives = m.objectives && m.objectives.length > 0;
  const hasBriefing = m.briefing && m.briefing.cells.length > 0;
  const hasOOB = m.formations.length > 0 || m.units.length > 0;
  const heroImg = m.mapImage
    ? assetUrl(`missions/${m.folder}/${m.id}_briefing/${m.mapImage}`)
    : null;
  // Collapse the left image column when the asset is missing OR fails to load.
  const { showImage, onError } = useImageLoadState(heroImg);

  return (
    <div className="detail-inner">
      <div className={`hero mission-hero${showImage ? '' : ' no-image'}`}>
        {showImage && (
          <div className="hero-img-wrap">
            <img src={heroImg} alt={m.name} onError={onError} />
          </div>
        )}
        <div className="hero-info">
          <div className="hero-label mission-folder">{m.folder}</div>
          <h1 className="hero-name">{m.name}</h1>
          <div className="hero-sub">
            <Difficulty value={m.difficulty} showLabel />
            {m.date && <span>{m.date}</span>}
            {m.time && <span>{m.time}</span>}
            {m.location && m.location !== '—' && <span>{m.location}</span>}
          </div>
          <div className="hero-badges">
            {m.environment?.seaState && (
              <div className="badge-chip">海况 · {m.environment.seaState}</div>
            )}
            {m.environment?.clouds && (
              <div className="badge-chip">云层 · {m.environment.clouds}</div>
            )}
            {m.environment?.windDirection && (
              <div className="badge-chip">风向 · {m.environment.windDirection}</div>
            )}
          </div>
          <div className="hero-meta-id">{m.id.toUpperCase()}</div>
        </div>
      </div>

      <StatsStrip stats={stats} />

      <div className="body-sections">
        {m.description && <div className="description-block">{m.description}</div>}

        {hasObjectives && (
          <Section title="任务目标" count={m.objectives.length}>
            <ul className="objective-list">
              {m.objectives.map((o) => (
                <li key={o.key} className="objective-row">
                  <span className="objective-check">☐</span>
                  <span className="objective-text">{o.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {hasOOB && (
          <Section title="战斗序列">
            <OrderOfBattle formations={m.formations} units={m.units} />
          </Section>
        )}

        {hasBriefing && (
          <details className="raw" open>
            <summary>任务简报 · 电传报文</summary>
            <MissionBriefing briefing={m.briefing!} />
          </details>
        )}

        <details className="raw">
          <summary>战场环境 · 原始字段</summary>
          <div style={{ padding: 12 }}>
            <div className="specs-grid">
              {envRow('日期', m.environment.date)}
              {envRow('时间', m.environment.time)}
              {envRow('海况', m.environment.seaState)}
              {envRow('云层', m.environment.clouds)}
              {envRow('风向', m.environment.windDirection)}
              {envRow('地图中心', `${m.environment.mapCenterLat.toFixed(2)}°N ${m.environment.mapCenterLon.toFixed(2)}°E`)}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function envRow(label: string, value: string | null): React.ReactNode {
  if (!value) return null;
  return (
    <div className="spec" key={label}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

function pickStats(m: MissionDetail): Stat[] {
  const out: Stat[] = [];
  out.push({ label: '难度', value: difficultyStars(m.difficulty), unit: '' });
  if (m.date) out.push({ label: '日期', value: m.date, unit: '' });
  if (m.time) out.push({ label: '时间', value: m.time, unit: '' });
  out.push({
    label: '我方',
    value: sideTotalLabel(m.playerSide),
    unit: '',
    hint: sideHint(m.playerSide),
  });
  out.push({
    label: '敌方',
    value: sideTotalLabel(m.enemySide),
    unit: '',
    hint: sideHint(m.enemySide),
  });
  if (m.environment.seaState) {
    out.push({ label: '海况', value: m.environment.seaState, unit: '' });
  }
  return out;
}

function sideTotalLabel(s: MissionDetail['playerSide']): string {
  const total = s.vessels + s.aircraft + s.submarines + s.helicopters + s.landUnits;
  return `${total}`;
}

function sideHint(s: MissionDetail['playerSide']): string {
  const parts: string[] = [];
  if (s.vessels) parts.push(`舰 ${s.vessels}`);
  if (s.submarines) parts.push(`潜 ${s.submarines}`);
  if (s.aircraft) parts.push(`机 ${s.aircraft}`);
  if (s.helicopters) parts.push(`直 ${s.helicopters}`);
  if (s.landUnits) parts.push(`陆 ${s.landUnits}`);
  return parts.length > 0 ? parts.join(' · ') : '无';
}
