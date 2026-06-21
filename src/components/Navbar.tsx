"use client";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { LogOut } from "lucide-react";
import MagneticButton from "./MagneticButton";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NavbarContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "vault";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav>
      <h1><Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>PROMPTA</Link></h1>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {user ? (
          <>
            <div style={{ display: "flex", gap: "1rem", marginRight: "1rem" }}>
              <Link href="/?view=vault" style={{ textDecoration: "none", color: "inherit", fontWeight: currentView === "vault" ? "900" : "normal", opacity: currentView === "vault" ? 1 : 0.5 }}>
                [ VAULT ]
              </Link>
              <Link href="/?view=inbox" style={{ textDecoration: "none", color: "inherit", fontWeight: currentView === "inbox" ? "900" : "normal", opacity: currentView === "inbox" ? 1 : 0.5 }}>
                [ INBOX ]
              </Link>
            </div>
            <MagneticButton>
              <button onClick={handleLogout} style={{ padding: "0.5rem", display: "flex", alignItems: "center", border: "2px solid var(--border-color)" }} title="Logout">
                <LogOut size={18} />
              </button>
            </MagneticButton>
          </>
        ) : (
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>[ OFFLINE ]</span>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<nav><h1>PROMPTA</h1><ThemeToggle /></nav>}>
      <NavbarContent />
    </Suspense>
  );
}
