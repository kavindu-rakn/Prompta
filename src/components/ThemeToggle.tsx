"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import MagneticButton from "./MagneticButton";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
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
    <MagneticButton style={{ marginLeft: "1rem" }}>
      <button onClick={toggleTheme} style={{ padding: "0.5rem", display: "flex", alignItems: "center" }} title="Toggle Theme">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </MagneticButton>
  );
}
