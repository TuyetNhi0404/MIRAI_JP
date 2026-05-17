// src/features/AntiCheatProvider.tsx
import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAntiCheat } from '../hooks/useAntiCheat';
import type { AntiCheatLog } from '../types/quiz.types';

/**
 * ============================================
 * CONTEXT TYPE DEFINITIONS
 * ============================================
 */

interface AntiCheatContextValue {
  // State
  logs: AntiCheatLog[];
  violationCount: number;
  isFullscreen: boolean;
  isLocked: boolean;
  showWarning: boolean;
  currentWarningType: string;
  maxViolations: number;
  
  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  clearLogs: () => void;
  getSummary: () => {
    totalViolations: number;
    tabSwitches: number;
    windowBlurs: number;
    copyEvents: number;
    pasteEvents: number;
    rightClicks: number;
    fullscreenExits: number;
    devToolsAttempts: number;
    textSelections: number;
  };
  shouldAutoSubmit: () => boolean;
}

const AntiCheatContext = createContext<AntiCheatContextValue | undefined>(undefined);

/**
 * ============================================
 * PROVIDER COMPONENT
 * ============================================
 */

interface AntiCheatProviderProps {
  children: ReactNode;
  config?: {
    maxViolations?: number;
    enableFullscreen?: boolean;
    enableDevToolsDetection?: boolean;
    enableCopyPasteBlock?: boolean;
    enableContextMenuBlock?: boolean;
    enableTabSwitchDetection?: boolean;
    warningDuration?: number;
  };
}

export const AntiCheatProvider: React.FC<AntiCheatProviderProps> = ({
  children,
  config = {},
}) => {
  const antiCheat = useAntiCheat(config);

  return (
    <AntiCheatContext.Provider value={antiCheat}>
      {children}
    </AntiCheatContext.Provider>
  );
};

/**
 * ============================================
 * HOOK TO USE CONTEXT
 * ============================================
 */

export const useAntiCheatContext = () => {
  const context = useContext(AntiCheatContext);
  
  if (context === undefined) {
    throw new Error('useAntiCheatContext must be used within AntiCheatProvider');
  }
  
  return context;
};

/**
 * ============================================
 * HOC FOR PROTECTED COMPONENTS
 * ============================================
 */

interface WithAntiCheatProps {
  enableAntiCheat?: boolean;
}

export const withAntiCheat = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & WithAntiCheatProps> => {
  return ({ enableAntiCheat = true, ...props }: WithAntiCheatProps) => {
    if (!enableAntiCheat) {
      return <Component {...(props as P)} />;
    }

    return (
      <AntiCheatProvider>
        <Component {...(props as P)} />
      </AntiCheatProvider>
    );
  };
};
