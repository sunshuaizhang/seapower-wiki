// Top-level composition: provider + layout + popover singleton.

import { useEffect, useState } from 'react';
import { getMeta } from './api';
import { AmmoPopover } from './components/AmmoPopover';
import { Detail } from './components/Detail';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UnitPopover } from './components/UnitPopover';
import { AppProvider } from './state/AppContext';
import type { Meta } from './types';

function AppShell() {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    getMeta()
      .then(setMeta)
      .catch((e: unknown) => console.warn('meta failed', e));
  }, []);

  const streamingAssets = meta?.streamingAssets ?? '';
  const gameVersion = meta?.gameVersion;

  return (
    <>
      <Topbar streamingAssets={streamingAssets} gameVersion={gameVersion} />
      <main className="layout">
        <Sidebar />
        <Detail streamingAssets={streamingAssets} />
      </main>
      <AmmoPopover />
      <UnitPopover />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
