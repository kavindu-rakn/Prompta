"use client";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav>
      <h1>PROMPTA</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {user ? (
          <>
            <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>{user.email}</span>
            <button onClick={handleLogout} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "2px solid var(--border-color)" }}>[ LOGOUT ]</button>
          </>
        ) : (
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>[ OFFLINE ]</span>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}
