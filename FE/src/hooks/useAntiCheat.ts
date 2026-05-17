// src/hooks/useAntiCheat.ts - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AntiCheatLog } from '../types/quiz.types';

interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface AntiCheatConfig {
  maxViolations: number;
  enableFullscreen: boolean;
  enableDevToolsDetection: boolean;
  enableCopyPasteBlock: boolean;
  enableContextMenuBlock: boolean;
  enableTabSwitchDetection: boolean;
  warningDuration: number;
}

const DEFAULT_CONFIG: AntiCheatConfig = {
  maxViolations: 5,
  enableFullscreen: true,
  enableDevToolsDetection: true,
  enableCopyPasteBlock: true,
  enableContextMenuBlock: true,
  enableTabSwitchDetection: true,
  warningDuration: 5000,
};

interface ViolationSummary {
  totalViolations: number;
  tabSwitches: number;
  windowBlurs: number;
  copyEvents: number;
  pasteEvents: number;
  rightClicks: number;
  fullscreenExits: number;
  devToolsAttempts: number;
  textSelections: number;
}

export const useAntiCheat = (config: Partial<AntiCheatConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State Management
  const [logs, setLogs] = useState<AntiCheatLog[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [currentWarningType, setCurrentWarningType] = useState<string>('');

  // Refs
  const logsRef = useRef<AntiCheatLog[]>([]);
  const violationCountRef = useRef(0);
  const devToolsCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMonitoringActiveRef = useRef(false); // ✅ FIX: Renamed to avoid confusion

  /**
   * ============================================
   * LOGGING SYSTEM
   * ============================================
   */
  const addLog = useCallback((type: AntiCheatLog['type'], details?: string) => {
    // ✅ FIX: Only log if monitoring is active
    if (!isMonitoringActiveRef.current) {
      console.log('⏸️ Anti-cheat monitoring not active, ignoring violation:', type);
      return;
    }

    const newLog: AntiCheatLog = {
      type,
      timestamp: Date.now(),
      details,
    };

    setLogs((prev) => {
      const updated = [...prev, newLog];
      logsRef.current = updated;
      try {
        sessionStorage.setItem('quiz_anti_cheat_logs', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save logs to sessionStorage:', e);
      }
      return updated;
    });

    setViolationCount((prev) => {
      const newCount = prev + 1;
      violationCountRef.current = newCount;
      sessionStorage.setItem('quiz_violation_count', String(newCount));
      return newCount;
    });

    setCurrentWarningType(type);
    setShowWarning(true);

    setTimeout(() => {
      setShowWarning(false);
    }, finalConfig.warningDuration);

    console.warn(`🚨 Anti-Cheat Violation: ${type}`, details);
  }, [finalConfig.warningDuration]);

  /**
   * ============================================
   * TAB SWITCH & WINDOW BLUR DETECTION
   * ============================================
   */
  useEffect(() => {
    if (!finalConfig.enableTabSwitchDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isMonitoringActiveRef.current) {
        addLog('tab_switch', 'User switched to another tab');
      }
    };

    const handleWindowBlur = () => {
      if (isMonitoringActiveRef.current) {
        addLog('window_blur', 'Quiz window lost focus');
      }
    };

    const handleWindowFocus = () => {
      if (isMonitoringActiveRef.current) {
        console.log('✅ User returned to quiz window');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [finalConfig.enableTabSwitchDetection, addLog]);

  /**
   * ============================================
   * FULLSCREEN DETECTION - FIXED
   * ============================================
   */
  const requestFullscreen = useCallback(async () => {
    if (!finalConfig.enableFullscreen) return;

    try {
      const elem = document.documentElement as HTMLElementWithFullscreen;
      
      // ✅ FIX: Try multiple fullscreen APIs
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      } else {
        console.warn('⚠️ Fullscreen API not supported by this browser');
        return;
      }
      
      setIsFullscreen(true);
      console.log('🖥️ Fullscreen mode activated');
    } catch (error) {
      // ✅ FIX: Only show user gesture error if it's the actual error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('⚠️ Fullscreen requires user gesture, will retry on interaction');
      } else {
        console.error('Failed to enter fullscreen:', error);
      }
    }
  }, [finalConfig.enableFullscreen]);

  const exitFullscreen = useCallback(async () => {
    try {
      const doc = document as DocumentWithFullscreen;
      
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      
      setIsFullscreen(false);
      console.log('🖥️ Exited fullscreen mode');
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    if (!finalConfig.enableFullscreen) return;

    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      // ✅ FIX: Only log violation if monitoring is active AND user exited fullscreen
      if (!isCurrentlyFullscreen && isMonitoringActiveRef.current) {
        addLog('fullscreen_exit', 'User exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [finalConfig.enableFullscreen, addLog]);

  /**
   * ============================================
   * DEVTOOLS DETECTION
   * ============================================
   */
  useEffect(() => {
    if (!finalConfig.enableDevToolsDetection) return;

    const detectDevTools = () => {
      if (!isMonitoringActiveRef.current) return false;

      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        addLog('devtools_open', 'DevTools detected via window size');
        return true;
      }

      return false;
    };

    devToolsCheckIntervalRef.current = setInterval(detectDevTools, 2000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMonitoringActiveRef.current) return;

      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
        addLog('devtools_open', 'DevTools shortcut key pressed');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (devToolsCheckIntervalRef.current) {
        clearInterval(devToolsCheckIntervalRef.current);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [finalConfig.enableDevToolsDetection, addLog]);

  /**
   * ============================================
   * COPY/PASTE/CUT BLOCKING
   * ============================================
   */
  useEffect(() => {
    if (!finalConfig.enableCopyPasteBlock) return;

    const handleCopy = (e: ClipboardEvent) => {
      if (!isMonitoringActiveRef.current) return;
      e.preventDefault();
      addLog('copy', 'Copy action blocked');
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!isMonitoringActiveRef.current) return;
      e.preventDefault();
      addLog('paste', 'Paste action blocked');
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!isMonitoringActiveRef.current) return;
      e.preventDefault();
      addLog('copy', 'Cut action blocked');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, [finalConfig.enableCopyPasteBlock, addLog]);

  /**
   * ============================================
   * CONTEXT MENU (RIGHT CLICK) BLOCKING
   * ============================================
   */
  useEffect(() => {
    if (!finalConfig.enableContextMenuBlock) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (!isMonitoringActiveRef.current) return;
      e.preventDefault();
      addLog('right_click', 'Right click blocked');
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [finalConfig.enableContextMenuBlock, addLog]);

  /**
   * ============================================
   * TEXT SELECTION BLOCKING
   * ============================================
   */
  useEffect(() => {
    const handleSelectStart = (e: Event) => {
      if (!isMonitoringActiveRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('selectstart', handleSelectStart);

    const style = document.createElement('style');
    style.id = 'anti-cheat-selection-style';
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
      const styleEl = document.getElementById('anti-cheat-selection-style');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);

  /**
   * ============================================
   * AUTO-LOCK INPUT SYSTEM
   * ============================================
   */
  useEffect(() => {
    if (violationCount >= finalConfig.maxViolations) {
      setIsLocked(true);
    }
  }, [violationCount, finalConfig.maxViolations]);

  /**
   * ============================================
   * LOAD SAVED STATE FROM SESSIONSTORAGE
   * ============================================
   */
  useEffect(() => {
    try {
      const savedLogs = sessionStorage.getItem('quiz_anti_cheat_logs');
      const savedCount = sessionStorage.getItem('quiz_violation_count');

      if (savedLogs) {
        const parsed = JSON.parse(savedLogs) as AntiCheatLog[];
        setLogs(parsed);
        logsRef.current = parsed;
      }

      if (savedCount) {
        const count = parseInt(savedCount, 10);
        setViolationCount(count);
        violationCountRef.current = count;
      }
    } catch (e) {
      console.warn('Failed to load saved anti-cheat state:', e);
    }
  }, []);

  /**
   * ============================================
   * HELPER FUNCTIONS
   * ============================================
   */
  const getSummary = useCallback((): ViolationSummary => {
    const currentLogs = logsRef.current;
    return {
      totalViolations: currentLogs.length,
      tabSwitches: currentLogs.filter(l => l.type === 'tab_switch').length,
      windowBlurs: currentLogs.filter(l => l.type === 'window_blur').length,
      copyEvents: currentLogs.filter(l => l.type === 'copy').length,
      pasteEvents: currentLogs.filter(l => l.type === 'paste').length,
      rightClicks: currentLogs.filter(l => l.type === 'right_click').length,
      fullscreenExits: currentLogs.filter(l => l.type === 'fullscreen_exit').length,
      devToolsAttempts: currentLogs.filter(l => l.type === 'devtools_open').length,
      textSelections: 0,
    };
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logsRef.current = [];
    setViolationCount(0);
    violationCountRef.current = 0;
    sessionStorage.removeItem('quiz_anti_cheat_logs');
    sessionStorage.removeItem('quiz_violation_count');
  }, []);

  const startMonitoring = useCallback(() => {
    isMonitoringActiveRef.current = true;
    console.log('🔒 Anti-Cheat System: Monitoring started');
    
    if (finalConfig.enableFullscreen) {
      // ✅ FIX: Request fullscreen with a small delay to ensure user interaction
      setTimeout(() => {
        requestFullscreen();
      }, 100);
    }
  }, [finalConfig.enableFullscreen, requestFullscreen]);

  const stopMonitoring = useCallback(() => {
    isMonitoringActiveRef.current = false;
    console.log('🔓 Anti-Cheat System: Monitoring stopped');
    
    if (isFullscreen) {
      exitFullscreen();
    }
  }, [isFullscreen, exitFullscreen]);

  const shouldAutoSubmit = useCallback(() => {
    return violationCountRef.current >= finalConfig.maxViolations;
  }, [finalConfig.maxViolations]);

  /**
   * ============================================
   * RETURN API
   * ============================================
   */
  return {
    // State
    logs,
    violationCount,
    isFullscreen,
    isLocked,
    showWarning,
    currentWarningType,
    // Actions
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    exitFullscreen,
    clearLogs,
    getSummary,
    shouldAutoSubmit,
    // Config
    maxViolations: finalConfig.maxViolations,
  };
};