import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ColorTheme = 'emerald' | 'ocean' | 'turquoise' | 'purple' | 'amber';

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

// Theme color definitions (HSL values)
const themeColors: Record<ColorTheme, {
  light: {
    primary: string;
    secondary: string;
    accent: string;
    ring: string;
    sidebarPrimary: string;
    chart1: string;
    chart2: string;
  };
  dark: {
    primary: string;
    secondary: string;
    accent: string;
    ring: string;
    sidebarPrimary: string;
    chart1: string;
    chart2: string;
  };
}> = {
  emerald: {
    light: {
      primary: '196 73% 26%',
      secondary: '178 50% 45%',
      accent: '178 50% 45%',
      ring: '196 73% 26%',
      sidebarPrimary: '196 73% 26%',
      chart1: '196 73% 26%',
      chart2: '178 50% 45%',
    },
    dark: {
      primary: '178 50% 45%',
      secondary: '196 73% 26%',
      accent: '178 50% 35%',
      ring: '178 50% 45%',
      sidebarPrimary: '178 50% 45%',
      chart1: '178 50% 55%',
      chart2: '196 60% 45%',
    },
  },
  ocean: {
    light: {
      primary: '210 70% 35%',
      secondary: '200 60% 50%',
      accent: '200 60% 50%',
      ring: '210 70% 35%',
      sidebarPrimary: '210 70% 35%',
      chart1: '210 70% 35%',
      chart2: '200 60% 50%',
    },
    dark: {
      primary: '200 60% 50%',
      secondary: '210 70% 35%',
      accent: '200 50% 40%',
      ring: '200 60% 50%',
      sidebarPrimary: '200 60% 50%',
      chart1: '200 60% 55%',
      chart2: '210 60% 45%',
    },
  },
  turquoise: {
    light: {
      primary: '177 48% 45%',
      secondary: '180 40% 55%',
      accent: '180 40% 55%',
      ring: '177 48% 45%',
      sidebarPrimary: '177 48% 45%',
      chart1: '177 48% 45%',
      chart2: '180 40% 55%',
    },
    dark: {
      primary: '177 48% 50%',
      secondary: '180 40% 40%',
      accent: '177 40% 40%',
      ring: '177 48% 50%',
      sidebarPrimary: '177 48% 50%',
      chart1: '177 48% 55%',
      chart2: '180 40% 50%',
    },
  },
  purple: {
    light: {
      primary: '270 60% 45%',
      secondary: '280 50% 55%',
      accent: '280 50% 55%',
      ring: '270 60% 45%',
      sidebarPrimary: '270 60% 45%',
      chart1: '270 60% 45%',
      chart2: '280 50% 55%',
    },
    dark: {
      primary: '280 50% 55%',
      secondary: '270 60% 45%',
      accent: '280 40% 45%',
      ring: '280 50% 55%',
      sidebarPrimary: '280 50% 55%',
      chart1: '280 50% 60%',
      chart2: '270 50% 50%',
    },
  },
  amber: {
    light: {
      primary: '35 85% 45%',
      secondary: '25 75% 50%',
      accent: '25 75% 50%',
      ring: '35 85% 45%',
      sidebarPrimary: '35 85% 45%',
      chart1: '35 85% 45%',
      chart2: '25 75% 50%',
    },
    dark: {
      primary: '35 85% 50%',
      secondary: '25 75% 45%',
      accent: '35 70% 40%',
      ring: '35 85% 50%',
      sidebarPrimary: '35 85% 50%',
      chart1: '35 85% 55%',
      chart2: '25 70% 50%',
    },
  },
};

function applyColorTheme(theme: ColorTheme, isDark: boolean) {
  const root = document.documentElement;
  const colors = isDark ? themeColors[theme].dark : themeColors[theme].light;
  
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
  root.style.setProperty('--sidebar-ring', colors.ring);
  root.style.setProperty('--chart-1', colors.chart1);
  root.style.setProperty('--chart-2', colors.chart2);
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('color-theme') as ColorTheme) || 'emerald';
    }
    return 'emerald';
  });

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem('color-theme', theme);
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    applyColorTheme(colorTheme, isDark);
  }, [colorTheme]);

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          applyColorTheme(colorTheme, isDark);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [colorTheme]);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
}
