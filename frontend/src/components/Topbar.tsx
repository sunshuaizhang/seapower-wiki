// Top bar: brand + tabs + language picker.

import { LANGUAGES, TAB_LABELS } from '../constants';
import { useApp } from '../state/useApp';
import type { Category } from '../types';

type Props = {
  metaInfo: string; // shown as small grey "// lang=cn" text next to the title
};

export function Topbar({ metaInfo }: Props) {
  const { category, setCategory, lang, setLang } = useApp();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="insignia">⚓</span>
        <span className="title">SEA POWER · FIELD INTEL</span>
        <span className="subtitle">{metaInfo}</span>
      </div>
      <div className="controls">
        <div className="tabs" id="catTabs">
          {TAB_LABELS.map((t) => (
            <button
              key={t.cat}
              className={`tab${category === t.cat ? ' active' : ''}`}
              data-cat={t.cat}
              onClick={() => setCategory(t.cat as Category)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
