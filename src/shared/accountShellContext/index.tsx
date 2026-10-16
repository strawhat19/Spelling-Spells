import { createContext, useContext, type ReactNode } from 'react';

export type AccountShellRail = { scope: string; width: number; content: ReactNode };
type AccountShellGeometry = {
  scope: string;
  sticky: boolean;
  brandWidth: number;
  headerHeight: number;
  viewportHeight: number;
  reducedMotion: boolean;
  clearRail: (scope: string) => void;
  setRail: (rail: AccountShellRail) => void;
};

export const AccountShellContext = createContext<AccountShellGeometry | null>(null);
export const useAccountShell = () => useContext(AccountShellContext);
