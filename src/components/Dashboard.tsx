"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";
import { isLeader as isLeaderFn } from "@/lib/rbac";

type Department = { id: string; name: string; sort_order: number | null };
type TrainingTask = { id: string; module_id: string; sort_order: number | null; title?: string | null };
type TrainingModule = {
  id: string;
  department_id: string;
  sort_order: number | null;
  day_number?: number | null;
  title?: string | null;
};
type UserRow = { id: string; name?: string | null; role?: string | null; department_id?: string | null; custom_perms?: any };
type ProgressRow = { user_id: string; task_id: string; status?: string | null; completed?: boolean | null };

const Icon = {
  Sparkles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-700">
      <path d="M12 2l1.2 5.1L18 8.3l-4.3 2.1L12 16l-1.7-5.6L6 8.3l4.8-1.2L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 14l.7 2.8L9 18l-3.3 1.2L5 22l-.7-2.8L1 18l3.3-1.2L5 14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 13l.8 2.4L22 16l-2.2.6L19 19l-.8-2.4L16 16l2.2-.6L19 13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  StatsDept: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
      <path d="M4 21V3h16v18H4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  StatsModule: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-700">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  StatsTask: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-sky-700">
      <path d="M9 11l2 2 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  StatsUsers: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-rose-700">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  ProgressTitle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-800">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function pct(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {r}%
    </span>
  );
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function initials(name?: string | null) {
  const s = (name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  const a = parts[0]?.[0] || s[0];
  const b = parts.length > 1 ? parts[1]?.[0] : s.length > 1 ? s[1] : "";
  return (a + b).toUpperCase();
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<Record<string, boolean>>({});

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

      // 取数：departments / training_modules / training_tasks / users / user_task_progress
      const depRes = await supabase.from("departments").select("id,name,sort_order").order("sort_order", { ascending: true });
      const modRes = await supabase.from("training_modules").select("id,department_id,sort_order,day_number,title").order("sort_order", { ascending: true });
      const taskRes = await supabase.from("training_tasks").select("id,module_id,sort_order,title").order("sort_order", { ascending: true });
      const userRes = await supabase.from("users").select("id,name,role,department_id,custom_perms");
      const progRes = await supabase.from("user_task_progress").select("user_id,task_id,status,completed");

      setDepartments((depRes.data as any) || []);
      setModules((modRes.data as any) || []);
      setTasks((taskRes.data as any) || []);
      setUsers((userRes.data as any) || []);
      setProgress((progRes.data as any) || []);

      setLoading(false);
    })();
  }, [currentUser]);

  const isAdmin = (currentUser?.role || "") === "admin" || (currentUser?.role || "") === "admin_staff";
  const isLeader = currentUser ? isLeaderFn(currentUser as any) : false;
  const canSeeDashboard = isAdmin || hasPerm(currentUser as any, "view_team_progress");

  // 领导只看自己部门（你现有逻辑）
  const leaderDeptId = useMemo(() => {
    if (!currentUser) return null;
    const role = currentUser.role || "";
    if (role !== "leader") return null;
    return currentUser.department_id ? String(currentUser.department_id) : null;
  }, [currentUser]);

  const visibleDepartments = useMemo(() => {
    if (!currentUser) return [];
    if (isLeader && leaderDeptId) {
      return departments.filter((d) => String(d.id) === String(leaderDeptId));
    }
    return departments;
  }, [departments, currentUser, isLeader, leaderDeptId]);

  const deptIdToUsers = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    for (const u of users) {
      const did = String(u.department_id || "");
      if (!did) continue;
      if (!map[did]) map[did] = [];
      map[did].push(u);
    }
    // 可按名字排序
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN"));
    }
    return map;
  }, [users]);

  const moduleIdToTasks = useMemo(() => {
    const map: Record<string, TrainingTask[]> = {};
    for (const t of tasks) {
      const mid = String(t.module_id || "");
      if (!mid) continue;
      if (!map[mid]) map[mid] = [];
      map[mid].push(t);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [tasks]);

  const deptIdToAllTasks = useMemo(() => {
    const map: Record<string, TrainingTask[]> = {};
    const deptModules: Record<string, TrainingModule[]> = {};
    for (const m of modules) {
      const did = String(m.department_id || "");
      if (!did) continue;
      if (!deptModules[did]) deptModules[did] = [];
      deptModules[did].push(m);
    }
    for (const did of Object.keys(deptModules)) {
      const list: TrainingTask[] = [];
      deptModules[did].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      for (const m of deptModules[did]) {
        const tlist = moduleIdToTasks[String(m.id)] || [];
        for (const t of tlist) list.push(t);
      }
      map[did] = list;
    }
    return map;
  }, [modules, moduleIdToTasks]);

  const progressSetByUser = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const p of progress) {
      const uid = String(p.user_id);
      const tid = String(p.task_id);
      const done = p.completed === true || p.status === "completed";
      if (!done) continue;
      if (!map[uid]) map[uid] = new Set<string>();
      map[uid].add(tid);
    }
    return map;
  }, [progress]);

  const stat = useMemo(() => {
    const deptCount = visibleDepartments.length;
    const moduleCount = modules.length;
    const taskCount = tasks.length;
    const userCount = users.filter((u) => !!u.department_id).length;
    return { deptCount, moduleCount, taskCount, userCount };
  }, [visibleDepartments, modules, tasks, users]);

  const deptCards = useMemo(() => {
    // 每个部门：完成率 = 该部门所有任务里，所有员工平均完成？（旧版偏“部门整体进度”）
    // 这里用：部门所有员工完成任务数 / (部门员工数 * 任务总数)
    return visibleDepartments.map((d) => {
      const did = String(d.id);
      const dUsers = deptIdToUsers[did] || [];
      const dTasks = deptIdToAllTasks[did] || [];
      const total = dUsers.length * dTasks.length;

      let done = 0;
      for (const u of dUsers) {
        const set = progressSetByUser[String(u.id)] || new Set<string>();
        done += dTasks.reduce((acc, t) => acc + (set.has(String(t.id)) ? 1 : 0), 0);
      }

      const rate = total > 0 ? (done / total) * 100 : 0;

      return { dept: d, users: dUsers, tasks: dTasks, rate, totalTasks: dTasks.length };
    });
  }, [visibleDepartments, deptIdToUsers, deptIdToAllTasks, progressSetByUser]);

  const toggleDept = (deptId: string) => {
    setExpandedDept((p) => ({ ...p, [deptId]: !(p[deptId] ?? false) }));
  };
  const toggleUser = (userId: string) => {
    setExpandedUser((p) => ({ ...p, [userId]: !(p[userId] ?? false) }));
  };

  if (!canSeeDashboard) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="text-xl font-bold text-slate-800">无权限访问</div>
          <div className="mt-2 text-sm text-slate-500">仅管理员与可查看团队进度的账号可见。</div>
          <div className="mt-6">
            <Link className="text-emerald-700 underline" href="/training">
              返回培训计划
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const title = isLeader && !isAdmin ? "团队进度" : "总览 Dashboard";

  return (
    <div className="p-8">
      {/* 1 + 2：标题带图标 + 副标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Icon.Sparkles />
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        </div>
        <div className="mt-1 text-sm text-slate-600">查看公司培训整体情况与员工学习进度</div>
        <div className="mt-2 text-xs text-slate-400">
          统计来自：training_modules / training_tasks / users / user_task_progress
        </div>
      </div>

      {/* 5：4块统计卡片加图标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Icon.StatsDept />} title="部门总数" value={stat.deptCount} subtitle="活跃部门" />
        <StatCard icon={<Icon.StatsModule />} title="培训模块" value={stat.moduleCount} subtitle="课程模块" />
        <StatCard icon={<Icon.StatsTask />} title="培训任务" value={stat.taskCount} subtitle="总任务数" />
        <StatCard icon={<Icon.StatsUsers />} title="员工人数" value={stat.userCount} subtitle="在培人员" />
      </div>

      {/* 6：部门培训进度 标题加图标 + 副标题 */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Icon.ProgressTitle />
            <div className="text-lg font-bold text-slate-900">{isLeader ? "团队成员培训进度" : "部门培训进度"}</div>
          </div>
          <div className="mt-1 text-sm text-slate-500">点击员工姓名可查看具体任务完成详情</div>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">
              正在加载...
            </div>
          )}

          {!loading &&
            deptCards.map(({ dept, users: dUsers, tasks: dTasks, rate, totalTasks }) => {
              const did = String(dept.id);
              const open = expandedDept[did] ?? false;

              return (
                <div key={did} className="rounded-2xl border border-slate-200 bg-slate-50/40">
                  <button
                    className="w-full px-5 py-4 flex items-center justify-between"
                    onClick={() => toggleDept(did)}
                    type="button"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center">
                        {dept.name?.slice(0, 1) || "部"}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-bold text-slate-900 truncate">{dept.name}</div>
                        <div className="text-xs text-slate-500">
                          👥 {dUsers.length} 员工 · 📚 {modules.filter((m) => String(m.department_id) === did).length} 模块 · ✅ {totalTasks} 任务
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-40 hidden md:block">
                        <ProgressBar rate={rate} />
                      </div>
                      <ProgressBadge rate={rate} />
                      <div className="text-slate-500">{open ? "▲" : "▼"}</div>
                    </div>
                  </button>

                  {/* 7：员工头像 + 点击展开任务进度 */}
                  {open && (
                    <div className="px-5 pb-5">
                      {dUsers.length === 0 ? (
                        <div className="rounded-xl bg-white border border-slate-200 p-4 text-sm text-slate-500">
                          该部门暂无员工。
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {dUsers.map((u) => {
                            const uid = String(u.id);
                            const uOpen = expandedUser[uid] ?? false;

                            const doneSet = progressSetByUser[uid] || new Set<string>();
                            const doneCount = dTasks.reduce((acc, t) => acc + (doneSet.has(String(t.id)) ? 1 : 0), 0);
                            const uRate = dTasks.length > 0 ? (doneCount / dTasks.length) * 100 : 0;

                            return (
                              <div key={uid} className="rounded-2xl border border-slate-200 bg-white">
                                <button
                                  onClick={() => toggleUser(uid)}
                                  type="button"
                                  className="w-full px-4 py-4 flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                                      {initials(u.name)}
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <div className="font-semibold text-slate-900 truncate">{u.name || "未命名"}</div>
                                      <div className="text-xs text-slate-500">已完成 {doneCount}/{dTasks.length}</div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="w-28 hidden md:block">
                                      <ProgressBar rate={uRate} />
                                    </div>
                                    <ProgressBadge rate={uRate} />
                                    <div className="text-slate-500">{uOpen ? "▲" : "▼"}</div>
                                  </div>
                                </button>

                                {uOpen && (
                                  <div className="px-4 pb-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <div className="text-xs font-semibold text-slate-700 mb-2">任务明细</div>
                                      <div className="space-y-2 max-h-64 overflow-auto pr-1">
                                        {dTasks.length === 0 && (
                                          <div className="text-sm text-slate-500">该部门暂无任务。</div>
                                        )}

                                        {dTasks.map((t) => {
                                          const tid = String(t.id);
                                          const done = doneSet.has(tid);
                                          return (
                                            <div
                                              key={tid}
                                              className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 px-3 py-2"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                  className={`h-2.5 w-2.5 rounded-full ${
                                                    done ? "bg-emerald-600" : "bg-slate-300"
                                                  }`}
                                                />
                                                <div className="text-sm text-slate-800 truncate">
                                                  {t.title || `任务 ${tid}`}
                                                </div>
                                              </div>
                                              <div className="text-xs font-semibold">
                                                {done ? (
                                                  <span className="text-emerald-700">已完成</span>
                                                ) : (
                                                  <span className="text-slate-500">未完成</span>
                                                )}
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 8：底部“去培训计划”等按钮 —— 已移除（此处不再渲染任何按钮） */}
    </div>
  );
}
