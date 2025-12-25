"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRow } from "../lib/types";
import { hasPerm } from "../lib/permissions";

const I = {
  Dashboard: ({ active }: { active?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-emerald-700" : "text-slate-500"}>
      <path d="M4 13.5V6a2 2 0 0 1 2-2h4.5v9.5H4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 4H18a2 2 0 0 1 2 2v5.5h-6.5V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 16.5h6.5V20H6a2 2 0 0 1-2-2v-1.5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 13.5H20V18a2 2 0 0 1-2 2h-4.5v-6.5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Training: ({ active }: { active?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-emerald-700" : "text-slate-500"}>
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8M8 11h8M8 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Resources: ({ active }: { active?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-emerald-700" : "text-slate-500"}>
      <path d="M4 7a3 3 0 0 1 3-3h13v15a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 18a3 3 0 0 0 3 3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Users: ({ active }: { active?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-emerald-700" : "text-slate-500"}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Sales: ({ active }: { active?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-emerald-700" : "text-slate-500"}>
      <path d="M4 7h16M6 11h12M8 15h8M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-rose-600">
      <path d="M10 17l1 4h10V3H11l-1 4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="w-5 flex items-center justify-center">{icon}</span>
      {label}
    </Link>
  );
}

function canSeeDashboard(user: UserRow) {
  const role = user?.role || "";
  const isAdmin = ["admin", "admin_staff"].includes(role);
  if (isAdmin) return true;
  return hasPerm(user as any, "view_team_progress");
}
function canManageUsers(user: UserRow) {
  const role = user?.role || "";
  const isAdmin = role === "admin";
  if (isAdmin) return true;
  return hasPerm(user as any, "manage_users");
}
function canAccessSalesDep(user: UserRow) {
  return user?.role === "admin" || hasPerm(user as any, "sales_dep_access");
}

function initials(name?: string | null) {
  const s = (name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  const a = parts[0]?.[0] || s[0];
  const b = parts.length > 1 ? parts[1]?.[0] : s.length > 1 ? s[1] : "";
  return (a + b).toUpperCase();
}

export default function Sidebar({
  user,
  onLogout,
}: {
  user: UserRow;
  onLogout?: () => void;
}) {
  const pathname = usePathname();

  const role = user?.role || "";
  const isAdminLike = ["admin", "admin_staff"].includes(role);
  const isLeader = role === "leader";

  const showDashboard = canSeeDashboard(user);
  const showUsers = canManageUsers(user);
  const showSalesDep = canAccessSalesDep(user);

  const dashboardLabel = isLeader && showDashboard && !isAdminLike ? "团队进度" : "总览 Dashboard";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold">
          K
        </div>
        <div>
          <div className="font-semibold text-emerald-700 leading-5">KiwiTrain AI</div>
          <div className="text-xs text-slate-500">柯维留学事务所培训系统</div>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-4 space-y-1">
        {showDashboard && (
          <NavItem
            href="/dashboard"
            label={dashboardLabel}
            active={isActive("/dashboard")}
            icon={<I.Dashboard active={isActive("/dashboard")} />}
          />
        )}

        <NavItem
          href="/training"
          label="培训计划 Training"
          active={isActive("/training")}
          icon={<I.Training active={isActive("/training")} />}
        />
        <NavItem
          href="/resources"
          label="资料库 Resources"
          active={isActive("/resources")}
          icon={<I.Resources active={isActive("/resources")} />}
        />

        {showSalesDep && (
          <NavItem
            href="/salesdep"
            label="销售顾问 AI工作台"
            active={isActive("/salesdep")}
            icon={<I.Sales active={isActive("/salesdep")} />}
          />
        )}

        {showUsers && (
          <NavItem
            href="/users"
            label="账号管理 Users"
            active={isActive("/users")}
            icon={<I.Users active={isActive("/users")} />}
          />
        )}
      </div>

      {/* Footer user + logout */}
      <div className="mt-auto pt-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">
              {initials((user as any)?.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{(user as any)?.name || "未命名用户"}</div>
              <div className="text-xs text-slate-500 truncate">{(user as any)?.role || "user"}</div>
            </div>
          </div>

          <button
            onClick={() => onLogout?.()}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            type="button"
          >
            <I.Logout />
            退出登录
          </button>
        </div>
      </div>
    </aside>
  );
}
