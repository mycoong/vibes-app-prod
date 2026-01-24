"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch {}
      window.location.href = "/";
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ opacity: 0.8 }}>Logging out...</div>
    </div>
  );
}
