import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Check local storage or system preference
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('wcommerce-theme');
    if (savedTheme) return savedTheme;
    // Default to dark for this premium app
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
