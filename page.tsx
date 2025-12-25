"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import { getSessionUser } from "@/lib/session";

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar active="dashboard" user={user} />
        <main className="flex-1">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}
