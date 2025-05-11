import { createContext, useState, useEffect } from "react";

// Create the context with a default value
export const ThemeContext = createContext(null);

// Create a provider component
export const ThemeProvider = ({ children }) => {
  // Get the theme from localStorage if available, otherwise default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme : "light";
  });

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Update localStorage and apply theme class to body when theme changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.className = theme;
  }, [theme]);

  // Provide the theme state and toggle function to children
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
