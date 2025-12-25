"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRow } from "@/lib/types";
import { hasPerm } from "@/lib/permissions";

const I = {
  Dashboard: () => (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
      📊
    </span>
  ),
  Training: () => (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border text-slate-700">
      📅
    </span>
  ),
  Resources: () => (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border text-slate-700">
      📚
    </span>
  ),
  Users: () => (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border text-slate-700">
      👤
    </span>
  ),
};

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition
      ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function canSeeDashboard(user: UserRow) {
  const role = user?.role || "";
  const isAdminLike = ["admin", "admin_staff"].includes(role);
  if (isAdminLike) return true;
  return hasPerm(user as any, "view_team_progress");
}

function canManageUsers(user: UserRow) {
  const role = user?.role || "";
  const isAdmin = role === "admin";
  if (isAdmin) return true;
  return hasPerm(user as any, "manage_users");
}

export default function Sidebar({
  user,
  active,
}: {
  user: UserRow;
  active?: string; // 兼容 dashboard/page.tsx 传 active="dashboard"
}) {
  const pathname = usePathname();
  const role = user?.role || "";
  const isAdminLike = ["admin", "admin_staff"].includes(role);
  const isLeader = role === "leader";

  const showDashboard = canSeeDashboard(user);
  const showUsers = canManageUsers(user);

  const dashboardLabel = isLeader && showDashboard && !isAdminLike ? "团队进度" : "总览 Dashboard";

  const isActive = (href: string, key?: string) => {
    if (active && key) return active === key; // 优先用外部传入的 active
    return pathname === href || pathname.startsWith(href + "/");
  };

  const logout = () => {
    // 你项目里 getSessionUser 大概率来自 localStorage 的 kiwitrain_user
    try {
      localStorage.removeItem("kiwitrain_user");
    } catch {}
    window.location.href = "/login";
  };

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
            active={isActive("/dashboard", "dashboard")}
            icon={<I.Dashboard />}
          />
        )}

        <NavItem
          href="/training"
          label="培训计划 Training"
          active={isActive("/training", "training")}
          icon={<I.Training />}
        />

        <NavItem
          href="/resources"
          label="资料库 Resources"
          active={isActive("/resources", "resources")}
          icon={<I.Resources />}
        />

        {showUsers && (
          <NavItem
            href="/users"
            label="账号管理 Users"
            active={isActive("/users", "users")}
            icon={<I.Users />}
          />
        )}
      </div>

      {/* Footer user + logout */}
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-slate-100 border flex items-center justify-center text-slate-700 font-semibold">
            {(user?.name?.trim()?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.name || "User"}</div>
            <div className="text-xs text-slate-500 truncate">{user?.role || ""}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
