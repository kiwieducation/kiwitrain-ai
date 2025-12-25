"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";
import { isLeader as isLeaderFn } from "@/lib/rbac";

/* ================= Types ================= */
type Department = { id: string; name: string; sort_order?: number | null };
type TrainingModule = { id: string; department_id: string; title: string; sort_order?: number | null };
type TrainingTask = { id: string; module_id: string; title: string; sort_order?: number | null };
type UserRow = {
  id: string;
  name?: string | null;
  role?: string | null;
  department_id?: string | null;
  avatar_url?: string | null;
};
type UserTaskProgress = { user_id: string; task_id: string; is_completed?: boolean | null };

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

/* ================= Icons (inline, no deps) ================= */
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
    </svg>
  ),
  Layers: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  Check: (p: any) => (
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
  Chevron: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
};

/* ================= Helpers ================= */
function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = useMemo(() => {
    const s = (name || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [name]);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover border" />;
  }
  return <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">{initials}</div>;
}

/* ================= Page ================= */
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [progress, setProgress] = useState<UserTaskProgress[]>([]);

  const [openDept, setOpenDept] = useState<Record<string, boolean>>({});
  const [openUser, setOpenUser] = useState<Record<string, boolean>>({});

  const isAdminLike = ["admin", "admin_staff"].includes(user?.role);
  const isLeader = !!user && isLeaderFn(user);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [d, u, m, t, p] = await Promise.all([
        supabase.from("departments").select("id,name,sort_order").order("sort_order"),
        supabase.from("users").select("id,name,role,department_id,avatar_url"),
        supabase.from("training_modules").select("id,department_id,title,sort_order"),
        supabase.from("training_tasks").select("id,module_id,title,sort_order"),
        supabase.from("user_task_progress").select("user_id,task_id,is_completed"),
      ]);
      setDepartments(d.data || []);
      setUsers(u.data || []);
      setModules(m.data || []);
      setTasks(t.data || []);
      setProgress(p.data || []);
      setLoading(false);
    })();
  }, [user]);

  /* ===== derived ===== */
  const modulesByDept = useMemo(() => {
    const m: Record<string, TrainingModule[]> = {};
    modules.forEach((x) => ((m[x.department_id] ||= []).push(x)));
    return m;
  }, [modules]);

  const tasksByModule = useMemo(() => {
    const m: Record<string, TrainingTask[]> = {};
    tasks.forEach((x) => ((m[x.module_id] ||= []).push(x)));
    return m;
  }, [tasks]);

  const doneSet = useMemo(() => {
    const s = new Set<string>();
    progress.forEach((p) => p.is_completed && s.add(`${p.user_id}:${p.task_id}`));
    return s;
  }, [progress]);

  const deptUsers = useMemo(() => {
    const m: Record<string, UserRow[]> = {};
    users.forEach((u) => ((m[String(u.department_id || "")] ||= []).push(u)));
    return m;
  }, [users]);

  const deptTaskIds = useMemo(() => {
    const m: Record<string, string[]> = {};
    departments.forEach((d) => {
      const mods = modulesByDept[d.id] || [];
      m[d.id] = mods.flatMap((md) => (tasksByModule[md.id] || []).map((t) => t.id));
    });
    return m;
  }, [departments, modulesByDept, tasksByModule]);

  const pctDept = (deptId: string) => {
    const us = deptUsers[deptId] || [];
    const tids = deptTaskIds[deptId] || [];
    if (!us.length || !tids.length) return 0;
    let done = 0;
    us.forEach((u) => tids.forEach((t) => doneSet.has(`${u.id}:${t}`) && done++));
    return Math.round((done / (us.length * tids.length)) * 100);
  };

  if (!user) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-2xl bg-emerald-50 border flex items-center justify-center">
          <I.Dashboard className="h-5 w-5 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold">{isLeader && !isAdminLike ? "团队进度" : "总览 Dashboard"}</h1>
      </div>
      <p className="text-slate-600 mb-6">查看公司培训整体情况与员工学习进度</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat title="部门总数" value={departments.length} icon={<I.Building className="h-5 w-5" />} />
        <Stat title="培训模块" value={modules.length} icon={<I.Layers className="h-5 w-5" />} />
        <Stat title="培训任务" value={tasks.length} icon={<I.Check className="h-5 w-5" />} />
        <Stat title="员工人数" value={users.length} icon={<I.Users className="h-5 w-5" />} />
      </div>

      {/* Progress */}
      <div className="bg-white border rounded-2xl">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <I.Building className="h-5 w-5" />
            <span>{isLeader ? "团队成员培训进度" : "部门培训进度"}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">点击员工姓名可查看具体任务完成详情</div>
        </div>

        <div className="p-4 space-y-3">
          {loading && <div className="text-slate-500">正在加载...</div>}
          {!loading &&
            departments.map((d) => {
              const open = openDept[d.id];
              const rate = pctDept(d.id);
              return (
                <div key={d.id} className="border rounded-xl">
                  <button onClick={() => setOpenDept((p) => ({ ...p, [d.id]: !p[d.id] }))} className="w-full px-4 py-3 flex justify-between items-center">
                    <div className="font-semibold">{d.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-rose-600">{rate}%</span>
                      <I.Chevron className={cx("h-4 w-4 transition", open && "rotate-180")} />
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-2">
                      {(deptUsers[d.id] || []).map((u) => {
                        const tids = deptTaskIds[d.id] || [];
                        const done = tids.filter((t) => doneSet.has(`${u.id}:${t}`)).length;
                        return (
                          <div key={u.id} className="border rounded-lg p-3">
                            <button onClick={() => setOpenUser((p) => ({ ...p, [u.id]: !p[u.id] }))} className="w-full flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Avatar name={u.name || ""} url={u.avatar_url} />
                                <span className="font-medium">{u.name}</span>
                              </div>
                              <span className="text-sm text-slate-600">{done}/{tids.length}</span>
                            </button>

                            {openUser[u.id] && (
                              <div className="mt-3 space-y-1 text-sm">
                                {(modulesByDept[d.id] || []).map((m) => (
                                  <div key={m.id}>
                                    <div className="font-semibold">{m.title}</div>
                                    {(tasksByModule[m.id] || []).map((t) => {
                                      const ok = doneSet.has(`${u.id}:${t.id}`);
                                      return (
                                        <div key={t.id} className="flex justify-between pl-3">
                                          <span className={cx(ok ? "text-emerald-700" : "text-slate-500")}>{t.title}</span>
                                          <span>{ok ? "已完成" : "未完成"}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                                <div className="text-right mt-2">
                                  <Link href="/training" className="text-emerald-700 text-sm">去培训计划 →</Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-2xl p-5 flex justify-between items-center">
      <div>
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      <div className="h-10 w-10 rounded-xl bg-slate-50 border flex items-center justify-center">{icon}</div>
    </div>
  );
}
