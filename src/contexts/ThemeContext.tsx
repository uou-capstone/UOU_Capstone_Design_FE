import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    // localStorage에서 저장된 테마 모드 불러오기
    const savedThemeMode = localStorage.getItem('themeMode') as ThemeMode;
    if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
      return savedThemeMode;
    }
    return 'system';
  });

  const getSystemTheme = useCallback((): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (themeMode === 'system') {
      return getSystemTheme();
    }
    return themeMode === 'dark';
  });

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
    
    if (mode === 'system') {
      setIsDarkMode(getSystemTheme());
    } else {
      setIsDarkMode(mode === 'dark');
    }
  }, [getSystemTheme]);

  const toggleTheme = (): void => {
    // 현재 모드에 따라 토글
    if (themeMode === 'system') {
      // 시스템 모드일 때는 현재 시스템 테마의 반대로 설정
      const newMode = getSystemTheme() ? 'light' : 'dark';
      setThemeMode(newMode);
    } else {
      // light/dark 모드일 때는 반대로
      setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    }
  };

  useEffect(() => {
    // 시스템 테마 변경 감지 (시스템 모드일 때만)
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };

      // 최신 브라우저
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // 구형 브라우저 지원
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [themeMode]);

  useEffect(() => {
    // 테마 상태에 따라 body 클래스 업데이트
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const value: ThemeContextType = {
    isDarkMode,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
