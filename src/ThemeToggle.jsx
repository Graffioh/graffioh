import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded w-8"
      style={{
        backgroundColor:
          theme === "dark" ? "rgba(255, 255, 255, 0.0)" : "rgba(0, 0, 0, 0.0)",
        cursor: "pointer",
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "☀︎" : "☾"}
    </button>
  );
};

export default ThemeToggle;
