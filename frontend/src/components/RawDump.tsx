// Bottom of the detail view — collapsible <pre> with the raw INI sections.

import { formatRaw } from '../utils/format';

export function RawDump({
  raw,
}: {
  raw: Record<string, Record<string, string>> | null | undefined;
}) {
  return (
    <details className="raw">
      <summary>原始 INI 数据(展开查看)</summary>
      <pre>{formatRaw(raw)}</pre>
    </details>
  );
}
