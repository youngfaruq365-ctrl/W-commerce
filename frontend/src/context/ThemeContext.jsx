import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Check local storage or system preference
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('wcommerce-theme');
    if (savedTheme) return savedTheme;
    
    // Default to dark for this premium app, but respect system preference if set
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all previous theme classes
    root.classList.remove('light', 'dark', 'midnight', 'forest', 'ocean', 'gold', 'highContrast');
    
    // Add current theme
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    localStorage.setItem('wcommerce-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('wcommerce-theme-override')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('wcommerce-theme-override', 'true');
      return newTheme;
    });
  };

  const changeTheme = (newTheme) => {
    localStorage.setItem('wcommerce-theme-override', 'true');
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
