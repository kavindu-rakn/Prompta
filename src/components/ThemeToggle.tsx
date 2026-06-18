"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    // Check local storage on mount
    const savedTheme = localStorage.getItem("prompta-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const isDark = 
      theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("prompta-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <button onClick={toggleTheme} style={{ marginLeft: "1rem", fontSize: "0.8rem", padding: "0.1rem 0.5rem" }}>
      {theme === "dark" ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}
