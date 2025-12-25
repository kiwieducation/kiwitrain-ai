"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRow } from "../lib/types";
import { hasPerm } from "../lib/permissions";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({ name, className }: { name: "dashboard" | "training" | "resources" | "sales" | "users" | "logout"; className?: string }) {
  const c = className ?? "h-5 w-5";
  if (name === "dashboard") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-18v7h7V2h-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === "training") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M2 8v8l10 5 10-5V8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === "resources") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M7 4v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name === "sales") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M7 17v3h10v-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 7V6a2 2 0 0 1 2-2h7v16h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M4 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 9l-3 3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Avatar({ user }: { user: { name?: string | null; avatar_url?: string | null } }) {
  const initials = (user?.name || "?").trim().slice(0, 2).toUpperCase();
  if (user?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar_url} alt={user?.name || "avatar"} className="h-9 w-9 rounded-full object-cover border border-slate-200" />;
  }
  return (
    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold border border-emerald-700/20">
      {initials}
    </div>
  );
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
      )}
    >
      <span className={clsx("h-9 w-9 rounded-2xl border flex items-center justify-center", active ? "bg-white border-emerald-200" : "bg-white border-slate-200")}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
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

export default function Sidebar({
  user,
  active,
  onLogout,
}: {
  user: UserRow;
  active?: "dashboard" | "training" | "resources" | "salesdep" | "users";
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const role = user?.role || "";
  const isAdminLike = ["admin", "admin_staff"].includes(role);
  const isLeader = role === "leader";

  const showDashboard = canSeeDashboard(user);
  const showUsers = canManageUsers(user);
  const showSalesDep = canAccessSalesDep(user);

  const dashboardLabel = isLeader && showDashboard && !isAdminLike ? "团队进度" : "总览 Dashboard";
  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 border-r border-slate-200 bg-white p-4 flex flex-col min-h-screen">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-extrabold shadow-sm">
          K
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-emerald-700 leading-5 truncate">KiwiTrain AI</div>
          <div className="text-xs text-slate-500 truncate">柯维留学事务所培训系统</div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {showDashboard && (
          <NavItem href="/dashboard" label={dashboardLabel} icon={<Icon name="dashboard" />} active={active === "dashboard" || isActiveHref("/dashboard")} />
        )}

        <NavItem href="/training" label="培训计划 Training" icon={<Icon name="training" />} active={active === "training" || isActiveHref("/training")} />
        <NavItem href="/resources" label="资料库 Resources" icon={<Icon name="resources" />} active={active === "resources" || isActiveHref("/resources")} />

        {showSalesDep && (
          <NavItem href="/salesdep" label="销售顾问 AI工作台" icon={<Icon name="sales" />} active={active === "salesdep" || isActiveHref("/salesdep")} />
        )}

        {showUsers && (
          <NavItem href="/users" label="账号管理 Users" icon={<Icon name="users" />} active={active === "users" || isActiveHref("/users")} />
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <Avatar user={user as any} />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{user?.name || "未命名用户"}</div>
              <div className="text-xs text-slate-500 truncate">{user?.role || ""}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
          >
            <Icon name="logout" className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </div>
    </aside>
  );
}
