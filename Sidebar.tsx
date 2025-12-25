"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";
import { isLeader as isLeaderFn } from "@/lib/rbac";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

const I = {
  Dashboard: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 13h6V4H4v9zM14 20h6V11h-6v9zM14 4h6v5h-6V4zM4 20h6v-5H4v5z" />
    </svg>
  ),
  Training: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 19a2 2 0 0 0 2 2h14" />
      <path d="M16 2H6a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h10" />
      <path d="M8 6h8M8 10h8M8 14h6" />
    </svg>
  ),
  Resources: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  LogOut: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
};

export default function Sidebar({
  active,
  user,
}: {
  active: "dashboard" | "training" | "resources" | "users";
  user: any;
}) {
  const isAdminLike = useMemo(() => {
    const r = user?.role || "";
    return r === "admin" || r === "admin_staff";
  }, [user]);

  const isLeader = useMemo(() => !!user && isLeaderFn(user), [user]);

  const canSeeDashboard = useMemo(() => {
    if (!user) return false;
    return isAdminLike || hasPerm(user, "view_team_progress");
  }, [user, isAdminLike]);

  const dashboardLabel = isLeader && canSeeDashboard && !isAdminLike ? "团队进度" : "总览 Dashboard";

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  return (
    <aside className="hidden md:flex md:w-[260px] flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold">K</div>
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 leading-tight">KiwiTrain AI</div>
          <div className="text-xs text-slate-500">柯维留学教务所培训系统</div>
        </div>
      </div>

      <nav className="px-3 space-y-1">
        {canSeeDashboard && (
          <NavItem href="/" active={active === "dashboard"} icon={<I.Dashboard className="h-4 w-4" />} label={dashboardLabel} />
        )}
        <NavItem href="/training" active={active === "training"} icon={<I.Training className="h-4 w-4" />} label="培训计划 Training" />
        <NavItem href="/resources" active={active === "resources"} icon={<I.Resources className="h-4 w-4" />} label="资料库 Resources" />
        {isAdminLike && <NavItem href="/users" active={active === "users"} icon={<I.Users className="h-4 w-4" />} label="账号管理 Users" />}
      </nav>

      <div className="mt-auto p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
            {(user?.name || "U")[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">{user?.name || "未命名"}</div>
            <div className="text-xs text-slate-500 truncate">{user?.role || "user"}</div>
          </div>
        </div>
        <button onClick={logout} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <I.LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
        active ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "text-slate-700 hover:bg-slate-50"
      )}
    >
      <span className={cn("text-slate-500", active && "text-emerald-700")}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
