// Consumer hook for the app context. Kept in its own file so the provider
// component file remains exclusively a component export (Fast Refresh requires
// component files to only export components).

import { useContext } from 'react';
import { AppContext } from './context';
import type { AppContextValue } from './context';

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used within <AppProvider>');
  return v;
}
