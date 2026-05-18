// Detail layout for a campaign: hero (background art + name/type/difficulty),
// stats strip, description, mission timeline (linear only) OR sandbox roster.

import { assetUrl } from '../api';
import type { CampaignDetail } from '../types';
import { useImageLoadState } from '../utils/useImageLoadState';
import { CampaignRoster } from './CampaignRoster';
import { MissionTimeline } from './MissionTimeline';
import { Section } from './Section';
import { StatsStrip } from './StatsStrip';
import type { Stat } from './StatsStrip';

export function CampaignDetailView({ c }: { c: CampaignDetail }) {
  const stats = pickStats(c);
  const heroImg = c.backgroundImage ? assetUrl(c.backgroundImage) : null;
  const { showImage, onError } = useImageLoadState(heroImg);
  const isLinear = c.type === 'Linear' && c.missions && c.missions.length > 0;

  return (
    <div className="detail-inner">
      <div className={`hero campaign-hero${showImage ? '' : ' no-image'}`}>
        {showImage && (
          <div className="hero-img-wrap">
            <img src={heroImg} alt={c.name} onError={onError} />
          </div>
        )}
        <div className="hero-info">
          <div className="hero-label campaign-type">{c.type}</div>
          <h1 className="hero-name">{c.name}</h1>
          <div className="hero-sub">
            {c.startDate && <span>{c.startDate} 起</span>}
            {c.playerNation && <span>玩家方 {c.playerNation}</span>}
            <span>{c.friendlyNations.length} 个盟友国</span>
          </div>
          <div className="hero-badges">
            {c.friendlyNations.slice(0, 12).map((n) => (
              <div className="badge-chip" key={n}>{n}</div>
            ))}
            {c.friendlyNations.length > 12 && (
              <div className="badge-chip dim">+{c.friendlyNations.length - 12}</div>
            )}
          </div>
          <div className="hero-meta-id">{c.id.toUpperCase()}</div>
        </div>
      </div>

      <StatsStrip stats={stats} />

      <div className="body-sections">
        {c.description && <div className="description-block">{c.description}</div>}

        {isLinear && (
          <Section title="任务序列" count={c.missions.length}>
            <MissionTimeline missions={c.missions} />
          </Section>
        )}

        {!isLinear && (
          <Section title="玩家舰艇编成" count={`${c.ports.length} 个驻地`}>
            <CampaignRoster ports={c.ports} />
          </Section>
        )}

        {c.friendlyNations.length > 0 && (
          <Section title="友方国家" count={c.friendlyNations.length}>
            <div className="nation-chips">
              {c.friendlyNations.map((n) => (
                <div className="nation-chip" key={n}>{n}</div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function pickStats(c: CampaignDetail): Stat[] {
  const out: Stat[] = [];
  out.push({ label: '类型', value: c.type, unit: '' });
  if (c.startDate) out.push({ label: '起始日期', value: c.startDate, unit: '' });
  if (c.playerNation) out.push({ label: '玩家方', value: c.playerNation, unit: '' });
  out.push({ label: '盟友国', value: String(c.friendlyNations.length), unit: '' });
  if (c.groupCount > 0) {
    out.push({ label: '舰艇群组', value: String(c.groupCount), unit: '' });
  }
  if (c.missionCount > 0) {
    out.push({ label: '任务数', value: String(c.missionCount), unit: '' });
  }
  return out;
}
