"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AuthUI from "@/components/AuthUI";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <main className="container" style={{ display: "flex", height: "calc(100vh - 85px)", justifyContent: "center", alignItems: "center" }}><h2 style={{ borderBottom: "none" }}>[ REDIRECTING... ]</h2></main>;
  }

  return (
    <main style={{ width: "100%", height: "calc(100vh - 85px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `body { overflow: hidden; }` }} />
      <AuthUI />
    </main>
  );
}
