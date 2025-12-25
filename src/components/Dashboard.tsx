"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";
import { isLeader as isLeaderFn } from "@/lib/rbac";

type Department = { id: string; name: string; sort_order?: number | null };
type UserRow = {
  id: string;
  name: string | null;
  role?: string | null;
  department_id?: string | null;
  avatar_url?: string | null;
};
type TrainingModule = { id: string; department_id: string; title: string; sort_order?: number | null };
type TrainingTask = { id: string; module_id: string; title: string; sort_order?: number | null };
type UserTaskProgress = { id: string; user_id: string; task_id: string; is_completed: boolean };

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

/** Inline icons (no extra deps) */
const I = {
  Dashboard: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 13h6V4H4v9zM14 20h6V11h-6v9zM14 4h6v5h-6V4zM4 20h6v-5H4v5z" />
    </svg>
  ),
  Building: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 21h18" />
      <path d="M9 21V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v13" />
      <path d="M5 21V6a2 2 0 0 1 2-2h2" />
      <path d="M15 21V4h2a2 2 0 0 1 2 2v15" />
      <path d="M12 10h.01M12 14h.01M12 18h.01" />
    </svg>
  ),
  Layers: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  CheckSquare: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
  ChevronDown: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" />
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

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = useMemo(() => {
    const s = (name || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] ?? "U";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
  }, [name]);

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={name} src={url} className="h-9 w-9 rounded-full object-cover border border-slate-200" />;
  }
  return (
    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [progress, setProgress] = useState<UserTaskProgress[]>([]);

  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<Record<string, boolean>>({});

  const isAdminLike = useMemo(() => {
    const r = currentUser?.role || "";
    return r === "admin" || r === "admin_staff";
  }, [currentUser]);

  const isLeader = useMemo(() => !!currentUser && isLeaderFn(currentUser), [currentUser]);

  const canSeeDashboard = useMemo(() => {
    if (!currentUser) return false;
    return isAdminLike || hasPerm(currentUser, "view_team_progress");
  }, [currentUser, isAdminLike]);

  const leaderDeptId = useMemo(() => {
    // If leader-only view: try department_id on user
    return currentUser?.department_id ? String(currentUser.department_id) : null;
  }, [currentUser]);

  const visibleDepartments = useMemo(() => {
    if (!currentUser) return [];
    if (isLeader && !isAdminLike && leaderDeptId) {
      return departments.filter((d) => String(d.id) === String(leaderDeptId));
    }
    return departments;
  }, [departments, currentUser, isLeader, isAdminLike, leaderDeptId]);

  const toggleDept = (deptId: string) => {
    setExpandedDept((p) => ({ ...p, [deptId]: !(p[deptId] ?? false) }));
  };
  const toggleUser = (userId: string) => {
    setExpandedUser((p) => ({ ...p, [userId]: !(p[userId] ?? false) }));
  };

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(u);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!canSeeDashboard) {
      setErr("无权限访问（需要 view_team_progress 权限或管理员）。");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);

      const deptRes = await supabase.from("departments").select("id,name,sort_order").order("sort_order", { ascending: true });
      if (deptRes.error) {
        setErr(deptRes.error.message);
        setLoading(false);
        return;
      }
      const depts = (deptRes.data || []) as Department[];
      setDepartments(depts);

      const usersRes = await supabase.from("users").select("id,name,role,department_id,avatar_url").order("created_at", { ascending: true });
      const modsRes = await supabase.from("training_modules").select("id,department_id,title,sort_order").order("sort_order", { ascending: true });
      const tasksRes = await supabase.from("training_tasks").select("id,module_id,title,sort_order").order("sort_order", { ascending: true });
      const progRes = await supabase.from("user_task_progress").select("id,user_id,task_id,is_completed");

      if (usersRes.error || modsRes.error || tasksRes.error || progRes.error) {
        setErr(usersRes.error?.message || modsRes.error?.message || tasksRes.error?.message || progRes.error?.message || "加载失败");
        setLoading(false);
        return;
      }

      setUsers((usersRes.data || []) as UserRow[]);
      setModules((modsRes.data || []) as TrainingModule[]);
      setTasks((tasksRes.data || []) as TrainingTask[]);
      setProgress((progRes.data || []) as UserTaskProgress[]);

      // Default expand first dept in view
      const initial: Record<string, boolean> = {};
      (isLeader && !isAdminLike && leaderDeptId ? depts.filter((d) => String(d.id) === String(leaderDeptId)) : depts).forEach((d, idx) => {
        initial[String(d.id)] = idx === 0;
      });
      setExpandedDept(initial);

      setLoading(false);
    })();
  }, [currentUser, canSeeDashboard, isLeader, isAdminLike, leaderDeptId]);

  const tasksByModule = useMemo(() => {
    const m: Record<string, TrainingTask[]> = {};
    for (const t of tasks) {
      const k = String(t.module_id);
      if (!m[k]) m[k] = [];
      m[k].push(t);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return m;
  }, [tasks]);

  const modulesByDept = useMemo(() => {
    const m: Record<string, TrainingModule[]> = {};
    for (const md of modules) {
      const k = String(md.department_id);
      if (!m[k]) m[k] = [];
      m[k].push(md);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return m;
  }, [modules]);

  const completedByUser = useMemo(() => {
    const s = new Set<string>();
    for (const p of progress) if (p.is_completed) s.add(`${p.user_id}::${p.task_id}`);
    return s;
  }, [progress]);

  const totals = useMemo(() => {
    const deptCount = visibleDepartments.length;
    const moduleCount = modules.length;
    const taskCount = tasks.length;
    const staffCount = users.filter((u) => u.role !== "disabled").length;
    return { deptCount, moduleCount, taskCount, staffCount };
  }, [visibleDepartments, modules.length, tasks.length, users]);

  const deptUsers = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    for (const u of users) {
      const k = String(u.department_id ?? "");
      if (!map[k]) map[k] = [];
      map[k].push(u);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return map;
  }, [users]);

  const deptTaskIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const d of departments) {
      const did = String(d.id);
      const mods = modulesByDept[did] || [];
      const ids: string[] = [];
      for (const m of mods) {
        for (const t of tasksByModule[String(m.id)] || []) ids.push(String(t.id));
      }
      map[did] = ids;
    }
    return map;
  }, [departments, modulesByDept, tasksByModule]);

  const userProgressPercent = (userId: string, deptId: string) => {
    const taskIds = deptTaskIds[String(deptId)] || [];
    if (taskIds.length === 0) return { pct: 0, done: 0, total: 0 };
    let done = 0;
    for (const tid of taskIds) if (completedByUser.has(`${userId}::${tid}`)) done++;
    const pct = Math.round((done / taskIds.length) * 100);
    return { pct, done, total: taskIds.length };
  };

  const deptPercent = (deptId: string) => {
    const us = deptUsers[String(deptId)] || [];
    const taskIds = deptTaskIds[String(deptId)] || [];
    if (us.length === 0 || taskIds.length === 0) return 0;
    let done = 0;
    for (const u of us) {
      for (const tid of taskIds) if (completedByUser.has(`${u.id}::${tid}`)) done++;
    }
    const total = us.length * taskIds.length;
    return Math.round((done / total) * 100);
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  if (!currentUser) return null;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <I.Dashboard className="h-5 w-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
              {isLeader && !isAdminLike ? "团队进度" : "总览 Dashboard"}
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-2">查看公司培训整体情况与员工学习进度</p>
          <p className="text-xs text-slate-400 mt-1">统计来自：training_modules / training_tasks / users / user_task_progress</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="部门总数" value={totals.deptCount} subtitle="活跃部门" icon={<I.Building className="h-5 w-5" />} />
        <StatCard title="培训模块" value={totals.moduleCount} subtitle="课程模块" icon={<I.Layers className="h-5 w-5" />} />
        <StatCard title="培训任务" value={totals.taskCount} subtitle="总任务数" icon={<I.CheckSquare className="h-5 w-5" />} />
        <StatCard title="员工人数" value={totals.staffCount} subtitle="在培人员" icon={<I.Users className="h-5 w-5" />} />
      </div>

      {/* Progress */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <I.Building className="h-5 w-5 text-slate-600" />
              <span>{isLeader ? "团队成员培训进度" : "部门培训进度"}</span>
            </div>
            <div className="text-sm text-slate-500 mt-1">点击员工姓名可查看具体任务完成详情</div>
          </div>
          <div className="text-xs text-slate-400 mt-1">{visibleDepartments.length} 个部门</div>
        </div>

        <div className="p-4 space-y-3">
          {loading && <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">正在加载...</div>}
          {!loading && err && <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">{err}</div>}

          {!loading &&
            !err &&
            visibleDepartments.map((d) => {
              const did = String(d.id);
              const open = expandedDept[did] ?? false;
              const pct = deptPercent(did);
              const usersOfDept = deptUsers[did] || [];
              const modCount = (modulesByDept[did] || []).length;
              const taskCount = (deptTaskIds[did] || []).length;

              return (
                <div key={did} className="rounded-2xl border border-slate-200 bg-slate-50/40">
                  <button
                    onClick={() => toggleDept(did)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold">
                        {(d.name || "部")[0]}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-bold text-slate-900 truncate">{d.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>👥 {usersOfDept.length} 员工</span>
                          <span>📚 {modCount} 模块</span>
                          <span>✅ {taskCount} 任务</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                          {pct}%
                        </span>
                      </div>
                      <I.ChevronDown className={cn("h-5 w-5 text-slate-500 transition-transform", open && "rotate-180")} />
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4">
                      {usersOfDept.length === 0 ? (
                        <div className="text-sm text-slate-500 px-2 py-3">该部门暂无员工。</div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {usersOfDept.map((u) => {
                              const name = u.name || "未命名";
                              const s = userProgressPercent(String(u.id), did);
                              const openUser = expandedUser[String(u.id)] ?? false;

                              return (
                                <div key={u.id} className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50/60 transition">
                                  <button
                                    onClick={() => toggleUser(String(u.id))}
                                    className="w-full flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Avatar name={name} url={u.avatar_url} />
                                      <div className="min-w-0 text-left">
                                        <div className="font-bold text-slate-900 truncate">{name}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                          已完成 {s.done}/{s.total}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                                      {s.pct}%
                                    </span>
                                  </button>

                                  {openUser && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                      <div className="text-xs text-slate-500 mb-2">任务完成详情</div>
                                      <div className="max-h-56 overflow-auto pr-1 space-y-1">
                                        {(modulesByDept[did] || []).map((m) => {
                                          const tlist = tasksByModule[String(m.id)] || [];
                                          if (tlist.length === 0) return null;
                                          return (
                                            <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-2">
                                              <div className="text-xs font-bold text-slate-800 mb-1">{m.title}</div>
                                              <div className="space-y-1">
                                                {tlist.map((t) => {
                                                  const done = completedByUser.has(`${u.id}::${t.id}`);
                                                  return (
                                                    <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        <span className={cn("h-2 w-2 rounded-full", done ? "bg-emerald-600" : "bg-slate-300")} />
                                                        <span className={cn("truncate", done ? "text-slate-700" : "text-slate-500")}>
                                                          {t.title}
                                                        </span>
                                                      </div>
                                                      <span className={cn("font-semibold", done ? "text-emerald-700" : "text-slate-400")}>
                                                        {done ? "已完成" : "未完成"}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="mt-3 text-right">
                                        <Link
                                          href={`/training`}
                                          className="text-xs font-semibold text-emerald-700 hover:underline"
                                        >
                                          去培训计划 →
                                        </Link>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom: removed the 3 buttons per request. */}
      <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
        <span>© KiwiTrain AI</span>
        <button onClick={logout} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700">
          <I.LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-slate-500">{title}</div>
        <div className="text-3xl font-extrabold text-slate-900 mt-1">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      </div>
      <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
        {icon}
      </div>
    </div>
  );
}
