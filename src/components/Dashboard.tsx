"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";

type Department = { id: string; name: string; sort_order: number | null };
type TrainingTask = { id: string; module_id: string; sort_order: number | null };
type TrainingModule = { id: string; department_id: string; sort_order: number | null; title?: string | null };
type UserRow = {
  id: string;
  name?: string | null;
  role?: string | null;
  department_id?: string | null;
  avatar_url?: string | null;
  custom_perms?: any;
};
type ProgressRow = {
  user_id: string;
  task_id: string;
  is_completed?: boolean | null;
  completed?: boolean | null;
  status?: string | null;
};

function pct(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const Icons = {
  Dashboard: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path
        d="M4 13.2c0-4.0 3.2-7.2 7.2-7.2h1.6C16.8 6 20 9.2 20 13.2V20H4v-6.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 20v-6.2c0-.9.7-1.6 1.6-1.6h4.8c.9 0 1.6.7 1.6 1.6V20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  Building: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path
        d="M4 20V6.8c0-.9.7-1.6 1.6-1.6h6.8c.9 0 1.6.7 1.6 1.6V20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 10h3.4c.9 0 1.6.7 1.6 1.6V20" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 9h4M7 12h4M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Users: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path
        d="M16.5 18.5c-.8-2.2-2.9-3.5-5-3.5s-4.2 1.3-5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11.5 13.3c2 0 3.6-1.6 3.6-3.6S13.5 6.1 11.5 6.1 7.9 7.7 7.9 9.7s1.6 3.6 3.6 3.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.5 18.5c-.4-1.1-1.2-2-2.2-2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  List: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M7 7h14M7 12h14M7 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  Done: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path
        d="M20 6.8 9.6 17.2 4 11.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

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
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700">
          {icon}
        </div>
      </div>
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

function Avatar({ user }: { user: UserRow }) {
  const name = (user?.name || "U").trim();
  const letter = (name[0] || "U").toUpperCase();
  const url = user?.avatar_url || "";

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-8 w-8 rounded-full object-cover border border-slate-200" />;
  }

  return (
    <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-sm font-bold">
      {letter}
    </div>
  );
}

function isCompleted(p?: ProgressRow | null) {
  if (!p) return false;
  if (typeof p.is_completed === "boolean") return p.is_completed;
  if (typeof p.completed === "boolean") return p.completed;
  if (typeof p.status === "string") return ["done", "completed", "complete", "finished"].includes(p.status.toLowerCase());
  return false;
}

export default function Dashboard() {
  const [me, setMe] = useState<UserRow | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const u = (await getSessionUser()) as any;
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setMe(u);

      // 数据来源说明：training_modules / training_tasks / users / user_task_progress
      const [deptRes, modRes, taskRes, userRes, progRes] = await Promise.all([
        supabase.from("departments").select("id,name,sort_order").order("sort_order", { ascending: true }),
        supabase.from("training_modules").select("id,department_id,sort_order,title").order("sort_order", { ascending: true }),
        supabase.from("training_tasks").select("id,module_id,sort_order").order("sort_order", { ascending: true }),
        supabase.from("users").select("id,name,role,department_id,avatar_url,custom_perms").order("created_at", { ascending: true }),
        supabase.from("user_task_progress").select("*"),
      ]);

      setDepartments((deptRes.data as any) || []);
      setModules((modRes.data as any) || []);
      setTasks((taskRes.data as any) || []);
      setUsers((userRes.data as any) || []);
      setProgress((progRes.data as any) || []);

      setLoading(false);
    })();
  }, []);

  const canSeeDashboard = useMemo(() => {
    if (!me) return false;
    const role = me.role || "";
    const isAdminLike = ["admin", "admin_staff"].includes(role);
    return isAdminLike || hasPerm(me as any, "view_team_progress");
  }, [me]);

  const deptById = useMemo(() => {
    const m: Record<string, Department> = {};
    for (const d of departments) m[String(d.id)] = d;
    return m;
  }, [departments]);

  const tasksByModule = useMemo(() => {
    const m: Record<string, TrainingTask[]> = {};
    for (const t of tasks) {
      const mid = String(t.module_id);
      if (!m[mid]) m[mid] = [];
      m[mid].push(t);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return m;
  }, [tasks]);

  const modulesByDept = useMemo(() => {
    const m: Record<string, TrainingModule[]> = {};
    for (const mod of modules) {
      const did = String(mod.department_id);
      if (!m[did]) m[did] = [];
      m[did].push(mod);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return m;
  }, [modules]);

  const progressMap = useMemo(() => {
    const m: Record<string, Record<string, ProgressRow>> = {};
    for (const p of progress) {
      const uid = String((p as any).user_id);
      const tid = String((p as any).task_id);
      if (!m[uid]) m[uid] = {};
      m[uid][tid] = p;
    }
    return m;
  }, [progress]);

  const totals = useMemo(() => {
    const deptCount = departments.length;

    const moduleCount = modules.length;
    const taskCount = tasks.length;

    // 员工数：排除 admin / admin_staff（你也可以按你们逻辑调整）
    const employeeList = users.filter((u) => !["admin", "admin_staff"].includes(String(u.role || "")));
    const employeeCount = employeeList.length;

    // 总完成数：统计 user_task_progress 里完成的条目
    const completedCount = progress.filter((p) => isCompleted(p)).length;

    return { deptCount, moduleCount, taskCount, employeeCount, completedCount };
  }, [departments, modules, tasks, users, progress]);

  const employeesWithStats = useMemo(() => {
    const employeeList = users.filter((u) => !["admin", "admin_staff"].includes(String(u.role || "")));

    const allTaskIds = tasks.map((t) => String(t.id));
    const totalTasks = allTaskIds.length || 1;

    return employeeList.map((u) => {
      const uid = String(u.id);
      let done = 0;
      const pForU = progressMap[uid] || {};
      for (const tid of allTaskIds) {
        if (isCompleted(pForU[tid])) done += 1;
      }
      const rate = (done / totalTasks) * 100;
      return { user: u, done, total: allTaskIds.length, rate: pct(rate) };
    });
  }, [users, tasks, progressMap]);

  const employeesByDept = useMemo(() => {
    const m: Record<string, ReturnType<typeof employeesWithStats>> = {};
    for (const row of employeesWithStats) {
      const did = String(row.user.department_id || "");
      if (!m[did]) m[did] = [];
      m[did].push(row);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => b.rate - a.rate);
    return m;
  }, [employeesWithStats]);

  const openUser = useMemo(() => {
    if (!openUserId) return null;
    return users.find((u) => String(u.id) === String(openUserId)) || null;
  }, [openUserId, users]);

  const openUserTasks = useMemo(() => {
    if (!openUser) return [];
    const uid = String(openUser.id);
    const pForU = progressMap[uid] || {};

    // 任务按模块排序展示
    const out: Array<{ moduleTitle: string; taskId: string; done: boolean }> = [];
    const modsSorted = [...modules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const mod of modsSorted) {
      const modTasks = tasksByModule[String(mod.id)] || [];
      for (const t of modTasks) {
        out.push({
          moduleTitle: mod.title || `培训日 ${mod.sort_order ?? ""}`,
          taskId: String(t.id),
          done: isCompleted(pForU[String(t.id)]),
        });
      }
    }
    return out;
  }, [openUser, modules, tasksByModule, progressMap]);

  if (!canSeeDashboard) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="text-xl font-bold text-slate-800">无权限访问</div>
          <div className="mt-2 text-sm text-slate-500">仅管理员或拥有 view_team_progress 权限的账号可见</div>
          <div className="mt-6">
            <Link className="text-emerald-700 underline" href="/training">
              去培训计划
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* 1 标题 + 图标 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <Icons.Dashboard className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900">总览 Dashboard</h1>
          </div>

          {/* 2 副标题 */}
          <p className="mt-2 text-sm text-slate-600">查看公司培训整体情况与员工学习进度</p>

          <p className="mt-2 text-xs text-slate-400">
            统计来自：training_modules / training_tasks / users / user_task_progress
          </p>
        </div>
      </div>

      {/* 5 统计卡片（四块 + 图标） */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="部门总数"
          value={loading ? "—" : totals.deptCount}
          subtitle="来自 departments"
          icon={<Icons.Building className="h-5 w-5" />}
        />
        <StatCard
          title="培训日总数"
          value={loading ? "—" : totals.moduleCount}
          subtitle="来自 training_modules"
          icon={<Icons.List className="h-5 w-5" />}
        />
        <StatCard
          title="任务总数"
          value={loading ? "—" : totals.taskCount}
          subtitle="来自 training_tasks"
          icon={<Icons.List className="h-5 w-5" />}
        />
        <StatCard
          title="员工人数"
          value={loading ? "—" : totals.employeeCount}
          subtitle={`已完成记录：${loading ? "—" : totals.completedCount}`}
          icon={<Icons.Users className="h-5 w-5" />}
        />
      </div>

      {/* 6 部门培训进度（标题+图标 + 副标题） */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-700">
                <Icons.Building className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900">部门培训进度</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">点击员工姓名可查看具体任务完成详情</p>
          </div>
        </div>

        {loading && (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">
            正在加载...
          </div>
        )}

        {!loading && (
          <div className="mt-4 space-y-3">
            {departments.map((d) => {
              const did = String(d.id);
              const isOpen = expandedDept[did] ?? true;
              const empList = employeesByDept[did] || [];
              const deptModules = modulesByDept[did] || [];

              return (
                <div key={did} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedDept((p) => ({ ...p, [did]: !(p[did] ?? true) }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-500">
                        {empList.length} 人 · {deptModules.length} 个培训日
                      </div>
                    </div>
                    <div className="text-slate-500 text-sm">{isOpen ? "▲" : "▼"}</div>
                  </button>

                  {isOpen && (
                    <div className="px-4 py-3">
                      {empList.length === 0 ? (
                        <div className="text-sm text-slate-500 py-4">该部门暂无员工数据。</div>
                      ) : (
                        <div className="space-y-2">
                          {empList.map((row) => (
                            <button
                              key={String(row.user.id)}
                              onClick={() => setOpenUserId(String(row.user.id))}
                              className="w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition p-3 text-left"
                            >
                              <div className="flex items-center gap-3">
                                {/* 7 头像 */}
                                <Avatar user={row.user} />

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {row.user.name || "未命名员工"}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500">
                                      {row.done}/{row.total}
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <ProgressBar rate={row.rate} />
                                  </div>
                                </div>

                                <span className="text-xs font-bold text-emerald-700">{row.rate}%</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7 点击员工 -> 任务完成详情弹窗 */}
      {openUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={openUser} />
                <div>
                  <div className="text-base font-bold text-slate-900">{openUser.name || "员工"}</div>
                  <div className="text-xs text-slate-500">
                    部门：{deptById[String(openUser.department_id || "")]?.name || "—"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOpenUserId(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                关闭
              </button>
            </div>

            <div className="p-5">
              <div className="text-sm font-semibold text-slate-800 mb-3">任务完成详情</div>

              {openUserTasks.length === 0 ? (
                <div className="text-sm text-slate-500">暂无任务数据。</div>
              ) : (
                <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {openUserTasks.map((x, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500">{x.moduleTitle}</div>
                          <div className="text-sm font-medium text-slate-900">任务 #{x.taskId}</div>
                        </div>
                        <div
                          className={cls(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
                            x.done
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          )}
                        >
                          {x.done && <Icons.Done className="h-4 w-4" />}
                          {x.done ? "已完成" : "未完成"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8 去掉底部“去培训计划”等按钮：这里不放任何按钮 */}
    </div>
  );
}
