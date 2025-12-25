"use client";

import { useEffect, useState } from "react";
import { getSessionUser, clearSessionUser } from "@/lib/session";
import type { UserRow } from "@/lib/types";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRow | null>(null);

  useEffect(() => {
    const u = getSessionUser();
    if (!u) {
      window.location.href = "/login";
      return;
    }
    setUser(u);
  }, []);

  function logout() {
    clearSessionUser();
    window.location.href = "/login";
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
