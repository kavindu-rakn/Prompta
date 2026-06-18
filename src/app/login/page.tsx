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
    return <main className="container"><h2 style={{ borderBottom: "none" }}>[ REDIRECTING... ]</h2></main>;
  }

  return (
    <main className="container" style={{ textAlign: "center", paddingTop: "5vh" }}>
      <AuthUI />
    </main>
  );
}
