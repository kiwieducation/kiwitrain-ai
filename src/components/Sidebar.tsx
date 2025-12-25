"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRow } from "@/lib/types";
import { hasPerm } from "@/lib/permissions";

const I = {
  Dashboard: () => <span>📊</span>,
  Training: () => <span>📅</span>,
  Resources: () => <span>📚</span>,
  Users: () => <span>👤</span>,
};

function NavItem({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${active ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50"}`}>
      {icon}
      {label}
    </Link>
  );
}

export default function Sidebar({ user, onLogout }: { user: UserRow; onLogout: () => void }) {
  const pathname = usePathname();
  const role = user?.role || "";
  const isAdmin = ["admin", "admin_staff"].includes(role);

  return (
    <aside className="w-64 border-r bg-white p-4 flex flex-col">
      <div className="px-2 py-3 mb-4">
        <div className="font-bold text-emerald-700">KiwiTrain AI</div>
        <div className="text-xs text-slate-500">柯维留学事务所培训系统</div>
      </div>

      <nav className="space-y-1">
        <NavItem href="/dashboard" label="总览 Dashboard" active={pathname.startsWith("/dashboard")} icon={<I.Dashboard />} />
        <NavItem href="/training" label="培训计划" active={pathname.startsWith("/training")} icon={<I.Training />} />
        <NavItem href="/resources" label="资料库" active={pathname.startsWith("/resources")} icon={<I.Resources />} />
        {isAdmin && <NavItem href="/users" label="账号管理" active={pathname.startsWith("/users")} icon={<I.Users />} />}
      </nav>

      <div className="mt-auto pt-4 border-t">
        <div className="text-sm font-medium">{user?.name}</div>
        <button onClick={onLogout} className="mt-2 text-sm text-rose-600">退出登录</button>
      </div>
    </aside>
  );
}
