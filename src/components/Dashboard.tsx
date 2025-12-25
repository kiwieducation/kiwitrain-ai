"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { getSessionUser } from "../lib/session";
import { hasPerm } from "../lib/permissions";
import { isLeader as isLeaderFn } from "../lib/rbac";
import type { UserRow } from "../lib/types";

type Department = { id: string; name: string; sort_order: number | null };
type TrainingModule = {
  id: string;
  department_id: string;
  sort_order: number | null;
  day_number?: number | null;
  title?: string | null;
};
type TrainingTask = {
  id: string;
  module_id: string;
  sort_order: number | null;
  title?: string | null;
};
type ProgressRow = { user_id: string; task_id: string; status?: string | null; completed?: boolean | null };

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function pct(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function Icon({
  name,
  className,
}: {
  name: "dashboard" | "book" | "check" | "users" | "building" | "sparkle";
  className?: string;
}) {
  const c = className ?? "h-5 w-5";
  if (name === "dashboard") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-18v7h7V2h-7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "book") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M7 4v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "building") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20V6a2 2 0 0 1 2-2h7v16H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path
          d="M13 10h5a2 2 0 0 1 2 2v8h-7V10Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7 8h3M7 12h3M7 16h3M16 14h2M16 17h2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l1.2 4.3L18 8l-4.8 1.7L12 14l-1.2-4.3L6 8l4.8-1.7L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M19 14l.7 2.4L22 17l-2.3.6L19 20l-.7-2.4L16 17l2.3-.6L19 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({ user, size = 32 }: { user: { name?: string | null; avatar_url?: string | null }; size?: number }) {
  const initials = (user?.name || "?").trim().slice(0, 2).toUpperCase();
  const s = `${size}px`;
  if (user?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.avatar_url}
        alt={user?.name || "avatar"}
        className="rounded-full object-cover border border-slate-200"
        style={{ width: s, height: s }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold border border-emerald-700/20"
      style={{ width: s, height: s, fontSize: size <= 28 ? "12px" : "13px" }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function ProgressBar({ rate }: { rate: number }) {
  const r = pct(rate);
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${r}%` }} />
    </div>
  );
}

function ProgressBadge({ rate }: { rate: number }) {
  const r = pct(rate);
  const cls =
    r >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : r >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  return <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cls)}>{r}%</span>;
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<Record<string, boolean>>({});

  const isLeader = useMemo(() => (currentUser ? isLeaderFn(currentUser as any) : false), [currentUser]);

  const visibleDepartments = useMemo(() => {
    if (!currentUser) return [];
    if (isLeader && currentUser.department_id) {
      return departments.filter((d) => String(d.id) === String(currentUser.department_id));
    }
    return departments;
  }, [departments, currentUser, isLeader]);

  const modulesByDept = useMemo(() => {
    const m = new Map<string, TrainingModule[]>();
    for (const mod of modules) {
      const k = String(mod.department_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(mod);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      m.set(k, arr);
    }
    return m;
  }, [modules]);

  const tasksByModule = useMemo(() => {
    const m = new Map<string, TrainingTask[]>();
    for (const t of tasks) {
      const k = String(t.module_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      m.set(k, arr);
    }
    return m;
  }, [tasks]);

  const userByDept = useMemo(() => {
    const m = new Map<string, UserRow[]>();
    for (const u of users) {
      const k = String(u.department_id ?? "");
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh"));
      m.set(k, arr);
    }
    return m;
  }, [users]);

  const progressByUser = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const p of progress) {
      const done = p.completed === true || p.status === "done" || p.status === "completed";
      if (!done) continue;
      const uid = String(p.user_id);
      const tid = String(p.task_id);
      if (!m.has(uid)) m.set(uid, new Set());
      m.get(uid)!.add(tid);
    }
    return m;
  }, [progress]);

  const allTaskIdsByDept = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of departments) {
      const did = String(d.id);
      const modList = modulesByDept.get(did) ?? [];
      const taskIds: string[] = [];
      for (const mod of modList) {
        const tl = tasksByModule.get(String(mod.id)) ?? [];
        for (const t of tl) taskIds.push(String(t.id));
      }
      m.set(did, taskIds);
    }
    return m;
  }, [departments, modulesByDept, tasksByModule]);

  const topStats = useMemo(() => {
    const deptCount = visibleDepartments.length;
    const visibleDeptIds = new Set(visibleDepartments.map((d) => String(d.id)));
    const visibleModules = modules.filter((m) => visibleDeptIds.has(String(m.department_id)));
    const visibleModuleIds = new Set(visibleModules.map((m) => String(m.id)));
    const visibleTasks = tasks.filter((t) => visibleModuleIds.has(String(t.module_id)));
    const visibleUsers = users.filter((u) => u.department_id && visibleDeptIds.has(String(u.department_id)));
    return {
      deptCount,
      moduleCount: visibleModules.length,
      taskCount: visibleTasks.length,
      userCount: visibleUsers.length,
    };
  }, [visibleDepartments, modules, tasks, users]);

  const toggleDept = (deptId: string) => setExpandedDept((p) => ({ ...p, [deptId]: !(p[deptId] ?? false) }));
  const toggleUser = (userId: string) => setExpandedUser((p) => ({ ...p, [userId]: !(p[userId] ?? false) }));

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(u as any);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    (async () => {
      setLoading(true);
      const [{ data: deptData }, { data: modData }, { data: taskData }, { data: userData }, { data: progData }] =
        await Promise.all([
          supabase.from("departments").select("id,name,sort_order").order("sort_order"),
          supabase.from("training_modules").select("id,department_id,sort_order,day_number,title").order("sort_order"),
          supabase.from("training_tasks").select("id,module_id,sort_order,title").order("sort_order"),
          supabase.from("users").select("id,name,role,department_id,custom_perms,avatar_url"),
          supabase.from("user_task_progress").select("user_id,task_id,status,completed"),
        ]);

      setDepartments((deptData as any) ?? []);
      setModules((modData as any) ?? []);
      setTasks((taskData as any) ?? []);
      setUsers((userData as any) ?? []);
      setProgress((progData as any) ?? []);
      setLoading(false);
    })();
  }, [currentUser]);

  if (!currentUser) return null;

  const canSeeUsers = currentUser.role === "admin" || hasPerm(currentUser as any, "manage_users");
  const canSeeSales = currentUser.role === "admin" || hasPerm(currentUser as any, "sales_dep_access");

  // ✅ 注意：这里不再渲染 Sidebar；Sidebar 应由外层 layout 统一提供
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-6 py-7">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="dashboard" className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">总览 Dashboard</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">查看公司培训整体情况与员工学习进度</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard icon={<Icon name="building" />} title="部门总数" value={topStats.deptCount} subtitle="活跃部门" />
          <StatCard icon={<Icon name="book" />} title="培训模块" value={topStats.moduleCount} subtitle="课程模块" />
          <StatCard icon={<Icon name="check" />} title="培训任务" value={topStats.taskCount} subtitle="总任务数" />
          <StatCard icon={<Icon name="users" />} title="员工人数" value={topStats.userCount} subtitle="在培人员" />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                <Icon name="sparkle" className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">部门培训进度</div>
                <div className="mt-1 text-xs text-slate-500">点击员工姓名可查看具体任务完成详情</div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {loading && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">正在加载...</div>
            )}

            {!loading && visibleDepartments.length === 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">暂无部门数据。</div>
            )}

            {!loading &&
              visibleDepartments.map((dept) => {
                const did = String(dept.id);
                const deptUsers = userByDept.get(did) ?? [];
                const deptTaskIds = allTaskIdsByDept.get(did) ?? [];
                const totalTasks = deptTaskIds.length || 0;

                const rates = deptUsers.map((u) => {
                  const done = progressByUser.get(String(u.id)) ?? new Set();
                  const completed = deptTaskIds.reduce((acc, tid) => acc + (done.has(tid) ? 1 : 0), 0);
                  return totalTasks ? completed / totalTasks : 0;
                });
                const deptRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

                const expanded = expandedDept[did] ?? false;

                return (
                  <div key={did} className="rounded-2xl border border-slate-200 bg-white">
                    <button
                      onClick={() => toggleDept(did)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 rounded-2xl"
                      type="button"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-sm">
                          {(dept.name || "?").slice(0, 1)}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="font-bold text-slate-900 truncate">{dept.name}</div>
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1">
                              <Icon name="users" className="h-4 w-4" />
                              {deptUsers.length} 员工
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon name="check" className="h-4 w-4" />
                              {totalTasks} 任务
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-40 hidden md:block">
                          <ProgressBar rate={deptRate * 100} />
                        </div>
                        <ProgressBadge rate={deptRate * 100} />
                        <div className="text-slate-500">{expanded ? "▲" : "▼"}</div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-5 pb-5">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {deptUsers.map((u) => {
                            const uid = String(u.id);
                            const done = progressByUser.get(uid) ?? new Set();
                            const completed = deptTaskIds.reduce((acc, tid) => acc + (done.has(tid) ? 1 : 0), 0);
                            const rate = totalTasks ? completed / totalTasks : 0;
                            const uExpanded = expandedUser[uid] ?? false;

                            return (
                              <div key={uid} className="rounded-2xl border border-slate-200 bg-white">
                                <button
                                  onClick={() => toggleUser(uid)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 rounded-2xl"
                                  type="button"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar user={u as any} size={32} />
                                    <div className="text-left">
                                      <div className="font-semibold text-slate-900">{u.name || "未命名员工"}</div>
                                      <div className="text-xs text-slate-500">已完成 {completed}/{totalTasks}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <ProgressBadge rate={rate * 100} />
                                    <div className="text-slate-500">{uExpanded ? "▲" : "▼"}</div>
                                  </div>
                                </button>

                                {uExpanded && (
                                  <div className="px-4 pb-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <div className="text-xs font-semibold text-slate-700 mb-2">任务完成详情</div>
                                      <div className="space-y-1 max-h-64 overflow-auto pr-1">
                                        {deptTaskIds.length === 0 && <div className="text-xs text-slate-500">该部门暂无任务。</div>}
                                        {deptTaskIds.map((tid) => {
                                          const t = tasks.find((x) => String(x.id) === String(tid));
                                          const ok = done.has(String(tid));
                                          return (
                                            <div key={tid} className="flex items-start gap-2 text-sm">
                                              <div
                                                className={clsx(
                                                  "mt-1 h-4 w-4 rounded-full border flex items-center justify-center",
                                                  ok
                                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                                    : "bg-white border-slate-300 text-transparent"
                                                )}
                                                aria-hidden="true"
                                              >
                                                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                                                  <path
                                                    d="M20 6 9 17l-5-5"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                </svg>
                                              </div>
                                              <div className={clsx("text-sm", ok ? "text-slate-900" : "text-slate-700")}>
                                                {t?.title || `任务 ${tid}`}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {deptUsers.length === 0 && (
                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">该部门暂无员工。</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-400">统计来源：departments / training_modules / training_tasks / users / user_task_progress</div>

        {(canSeeUsers || canSeeSales) && (
          <div className="mt-3 text-sm text-slate-500">
            {canSeeUsers && (
              <Link href="/users" className="text-emerald-700 hover:underline mr-4">
                账号管理
              </Link>
            )}
            {canSeeSales && (
              <Link href="/salesdep" className="text-emerald-700 hover:underline">
                销售顾问 AI工作台
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
