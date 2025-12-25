"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import Dashboard from "../../../components/Dashboard";
import { getSessionUser } from "../../../lib/session";

export default function Page() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setUser(u);
    })();
  }, []);

  const onLogout = async () => {
    try {
      // 如果你们有 /api/logout，就会生效；没有也不会影响
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem("kiwitrain_user");
    } catch {}
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar user={user} onLogout={onLogout} />
        <main className="flex-1">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}
