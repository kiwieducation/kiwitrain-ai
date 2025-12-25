"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { isLeader } from "@/lib/rbac";

type Department = { id: string; name: string; sort_order: number | null };
type TrainingPhase = { id: string; department_id: string; name: string; description: string | null; sort_order: number | null };
type TrainingModule = { id: string; department_id: string; phase_id: string | null; title: string; sort_order: number | null };
type TrainingTask = { id: string; module_id: string; title: string; task_type: string; sort_order: number | null };

function cls(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function TaskTypeBadge({ t }: { t: string }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border";
  if (t === "team") return <span className={cls(base, "bg-emerald-50 text-emerald-700 border-emerald-200")}>固定课</span>;
  if (t === "homework") return <span className={cls(base, "bg-amber-50 text-amber-700 border-amber-200")}>作业</span>;
  if (t === "self") return <span className={cls(base, "bg-sky-50 text-sky-700 border-sky-200")}>自学</span>;
  if (t === "quiz") return <span className={cls(base, "bg-violet-50 text-violet-700 border-violet-200")}>考核</span>;
  return <span className={cls(base, "bg-slate-50 text-slate-700 border-slate-200")}>{t}</span>;
}

export default function TrainingPage() {
  const user = useMemo(() => getSessionUser(), []);
  const canEdit = !!user && (user.role === "admin" || user.role === "leader" || (user as any).custom_perms?.includes?.("edit_training"));

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<Record<string, boolean>>({});

  // counts
  const [materialsCount, setMaterialsCount] = useState<Record<string, number>>({});
  const [quizCount, setQuizCount] = useState<Record<string, number>>({});

  // modals
  const [openPhaseModal, setOpenPhaseModal] = useState(false);
  const [openModuleModal, setOpenModuleModal] = useState(false);
  const [openTaskModal, setOpenTaskModal] = useState(false);

  // form
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDesc, setPhaseDesc] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [modulePhaseId, setModulePhaseId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<"team" | "homework" | "self" | "quiz">("team");
  const [taskModuleId, setTaskModuleId] = useState<string | null>(null);

  const visibleDepartments = useMemo(() => {
    if (!user) return [];
    if (isLeader(user) && user.department_id) return departments.filter((d) => String(d.id) === String(user.department_id));
    return departments;
  }, [departments, user]);

  useEffect(() => {
    if (!user) window.location.href = "/login";
  }, [user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const deptRes = await supabase.from("departments").select("id,name,sort_order").order("sort_order", { ascending: true });
        if (deptRes.error) throw deptRes.error;
        const deptData = (deptRes.data ?? []) as Department[];
        setDepartments(deptData);

        const firstVisible =
          (isLeader(user) && user.department_id ? deptData.find((d) => String(d.id) === String(user.department_id)) : deptData[0]) ?? null;
        setActiveDeptId(firstVisible ? String(firstVisible.id) : null);

        const phaseRes = await supabase.from("training_phases").select("id,department_id,name,description,sort_order").order("sort_order", { ascending: true });
        if (phaseRes.error) throw phaseRes.error;
        setPhases((phaseRes.data ?? []) as TrainingPhase[]);

        const modRes = await supabase.from("training_modules").select("id,department_id,phase_id,title,sort_order").order("sort_order", { ascending: true });
        if (modRes.error) throw modRes.error;
        setModules((modRes.data ?? []) as TrainingModule[]);

        const taskRes = await supabase.from("training_tasks").select("id,module_id,title,task_type,sort_order").order("sort_order", { ascending: true });
        if (taskRes.error) throw taskRes.error;
        const taskData = (taskRes.data ?? []) as TrainingTask[];
        setTasks(taskData);

        // counts for 资料 & 考核（按 taskId 聚合）
        const ids = taskData.map((t) => String(t.id));
        if (ids.length) {
          // task_materials
          // 这里 task_materials 可能是 task_id 或 training_task_id 两种列名（兼容旧表结构）
// 为了避免 TS 因为“二次赋值字段不一致”而报错，这里用 any 承接返回类型。
let mats: any = await supabase.from("task_materials").select("id,task_id").in("task_id", ids);

if (mats?.error && /column .*task_id/i.test(mats.error.message)) {
  mats = await supabase
    .from("task_materials")
    .select("id,training_task_id")
    .in("training_task_id", ids);
}
          if (!mats.error) {
            const mcount: Record<string, number> = {};
            for (const r of mats.data ?? []) {
              const k = String((r as any).task_id ?? (r as any).training_task_id);
              mcount[k] = (mcount[k] ?? 0) + 1;
            }
            setMaterialsCount(mcount);
          }

          // quiz_questions
          // quiz_questions 也可能是 task_id 或 training_task_id（兼容旧表结构）
let qq: any = await supabase.from("quiz_questions").select("id,task_id").in("task_id", ids);

if (qq?.error && /column .*task_id/i.test(qq.error.message)) {
  qq = await supabase
    .from("quiz_questions")
    .select("id,training_task_id")
    .in("training_task_id", ids);
}
          if (!qq.error) {
            const qcount: Record<string, number> = {};
            for (const r of qq.data ?? []) {
              const k = String((r as any).task_id ?? (r as any).training_task_id);
              qcount[k] = (qcount[k] ?? 0) + 1;
            }
            setQuizCount(qcount);
          }
        }
      } catch (e: any) {
        console.error("[Training load error]", { message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, raw: e });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const phasesOfDept = useMemo(() => (activeDeptId ? phases.filter((p) => String(p.department_id) === String(activeDeptId)) : []), [phases, activeDeptId]);
  const modulesOfDept = useMemo(() => (activeDeptId ? modules.filter((m) => String(m.department_id) === String(activeDeptId)) : []), [modules, activeDeptId]);

  const tasksByModule = useMemo(() => {
    const map: Record<string, TrainingTask[]> = {};
    for (const t of tasks) {
      const mid = String(t.module_id);
      if (!map[mid]) map[mid] = [];
      map[mid].push(t);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return map;
  }, [tasks]);

  const modulesByPhase = useMemo(() => {
    const map: Record<string, TrainingModule[]> = {};
    for (const p of phasesOfDept) map[String(p.id)] = [];
    for (const m of modulesOfDept) {
      const pid = m.phase_id ? String(m.phase_id) : "__no_phase__";
      if (!map[pid]) map[pid] = [];
      map[pid].push(m);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return map;
  }, [phasesOfDept, modulesOfDept]);

  const phaseStats = useMemo(() => {
    const out: Record<string, { moduleCount: number; taskCount: number }> = {};
    for (const p of phasesOfDept) out[String(p.id)] = { moduleCount: 0, taskCount: 0 };
    for (const m of modulesOfDept) {
      const pid = m.phase_id ? String(m.phase_id) : "__no_phase__";
      if (!out[pid]) out[pid] = { moduleCount: 0, taskCount: 0 };
      out[pid].moduleCount += 1;
      out[pid].taskCount += (tasksByModule[String(m.id)] ?? []).length;
    }
    return out;
  }, [phasesOfDept, modulesOfDept, tasksByModule]);

  function togglePhase(id: string) {
    setExpandedPhase((p) => ({ ...p, [id]: !p[id] }));
  }

  async function refreshAll() {
    setLoading(true);
    try {
      const phaseRes = await supabase.from("training_phases").select("id,department_id,name,description,sort_order").order("sort_order", { ascending: true });
      if (phaseRes.error) throw phaseRes.error;
      setPhases((phaseRes.data ?? []) as TrainingPhase[]);

      const modRes = await supabase.from("training_modules").select("id,department_id,phase_id,title,sort_order").order("sort_order", { ascending: true });
      if (modRes.error) throw modRes.error;
      setModules((modRes.data ?? []) as TrainingModule[]);

      const taskRes = await supabase.from("training_tasks").select("id,module_id,title,task_type,sort_order").order("sort_order", { ascending: true });
      if (taskRes.error) throw taskRes.error;
      setTasks((taskRes.data ?? []) as TrainingTask[]);
    } catch (e: any) {
      console.error("[Training refresh error]", e);
      alert(e?.message ?? "刷新失败");
    } finally {
      setLoading(false);
    }
  }

  async function addPhase() {
    if (!activeDeptId) return;
    const title = phaseTitle.trim();
    if (!title) return alert("请输入阶段标题");
    try {
      const current = phases.filter((p) => String(p.department_id) === String(activeDeptId));
      const nextOrder = (current.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0) || 0) + 1;

      const { error } = await supabase.from("training_phases").insert({
        department_id: activeDeptId,
        name: title,
        description: phaseDesc.trim() || null,
        sort_order: nextOrder,
      });
      if (error) throw error;

      setOpenPhaseModal(false);
      setPhaseTitle("");
      setPhaseDesc("");
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "添加阶段失败");
    }
  }

  async function addModule() {
    if (!activeDeptId) return;
    const title = moduleTitle.trim();
    if (!title) return alert("请输入培训日标题");
    try {
      const current = modules.filter((m) => String(m.department_id) === String(activeDeptId));
      const nextOrder = (current.reduce((mx, m) => Math.max(mx, m.sort_order ?? 0), 0) || 0) + 1;

      const { error } = await supabase.from("training_modules").insert({
        department_id: activeDeptId,
        phase_id: modulePhaseId,
        title,
        sort_order: nextOrder,
      });
      if (error) throw error;

      setOpenModuleModal(false);
      setModuleTitle("");
      setModulePhaseId(null);
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "添加培训日失败");
    }
  }

  async function addTask() {
    const title = taskTitle.trim();
    if (!title) return alert("请输入任务标题");
    if (!taskModuleId) return alert("请选择所属培训日/模块");
    try {
      const current = tasks.filter((t) => String(t.module_id) === String(taskModuleId));
      const nextOrder = (current.reduce((mx, t) => Math.max(mx, t.sort_order ?? 0), 0) || 0) + 1;

      const { error } = await supabase.from("training_tasks").insert({
        module_id: taskModuleId,
        title,
        task_type: taskType,
        sort_order: nextOrder,
      });
      if (error) throw error;

      setOpenTaskModal(false);
      setTaskTitle("");
      setTaskType("team");
      setTaskModuleId(null);
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "添加任务失败");
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-48px)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold flex items-center gap-2">
            ✨ 智能培训计划生成器 <span className="text-sm font-semibold text-slate-500">(管理员)</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">已接回：资料（task_materials）/ 考核（quiz_questions）入口。</div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setOpenPhaseModal(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              ＋ 添加阶段
            </button>
            <button onClick={() => setOpenModuleModal(true)} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700">
              ＋ 添加培训日
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="text-sm font-semibold text-slate-700 mb-2">目标部门 / 岗位</div>
          <div className="space-y-2">
            {loading && <div className="text-sm text-slate-500">加载中...</div>}
            {!loading &&
              visibleDepartments.map((d) => {
                const active = String(d.id) === String(activeDeptId);
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveDeptId(String(d.id))}
                    className={cls(
                      "w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition",
                      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    {d.name}
                  </button>
                );
              })}
          </div>
          <div className="mt-4 text-xs text-slate-400">
            当前角色：<span className="font-semibold">{user.role}</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-9">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold text-slate-800">培训日程</div>
              {canEdit && (
                <button onClick={() => setOpenTaskModal(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  ＋ 添加任务
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">
              {loading && <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">正在加载...</div>}

              {!loading && activeDeptId && phasesOfDept.map((p, idx) => {
                const expanded = expandedPhase[String(p.id)] ?? true;
                const stats = phaseStats[String(p.id)] ?? { moduleCount: 0, taskCount: 0 };
                const mods = modulesByPhase[String(p.id)] ?? [];

                return (
                  <div key={p.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40">
                    <button onClick={() => togglePhase(String(p.id))} className="w-full flex items-center justify-between px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-1.5 rounded-full bg-emerald-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-3">
                            第{idx + 1}阶段 - {p.name}
                            <span className="text-xs font-semibold text-slate-500">
                              {stats.moduleCount} 个培训日 · {stats.taskCount} 个任务
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{p.description ?? "（无描述）"}</div>
                        </div>
                      </div>
                      <div className="text-slate-500">{expanded ? "▲" : "▼"}</div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {mods.map((m) => {
                          const tlist = tasksByModule[String(m.id)] ?? [];
                          return (
                            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white">
                              <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold px-2 py-1">
                                    D{(m.sort_order ?? 0) || 1}
                                  </span>
                                  <div className="font-semibold text-slate-800">{m.title}</div>
                                </div>
                                <div className="text-xs text-slate-500">{tlist.length} 任务</div>
                              </div>

                              <div className="divide-y divide-slate-200">
                                {tlist.map((t) => {
                                  const tid = String(t.id);
                                  const mN = materialsCount[tid] ?? 0;
                                  const qN = quizCount[tid] ?? 0;
                                  return (
                                    <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-3">
                                        <div className="mt-1 h-4 w-4 rounded-full border border-slate-300 bg-white" />
                                        <div className="space-y-1">
                                          <div className="text-sm font-medium">{t.title}</div>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/training/tasks/${tid}/materials`}
                                              className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50"
                                            >
                                              资料 {mN}
                                            </Link>
                                            <Link
                                              href={`/training/tasks/${tid}/quiz`}
                                              className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50"
                                            >
                                              考核 {qN}
                                            </Link>
                                          </div>
                                        </div>
                                      </div>
                                      <TaskTypeBadge t={t.task_type} />
                                    </div>
                                  );
                                })}
                                {tlist.length === 0 && <div className="px-4 py-4 text-sm text-slate-500">暂无任务。</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {!loading && activeDeptId && phasesOfDept.length === 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">
                  该部门暂无培训阶段。{canEdit ? "你可以点击右上角“添加阶段”开始配置。" : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {canEdit && openPhaseModal && (
        <Modal title="添加阶段" onClose={() => setOpenPhaseModal(false)} onSubmit={addPhase} submitText="保存阶段">
          <Field label="阶段标题">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} placeholder="例如：入职培训" />
          </Field>
          <Field label="阶段描述（可选）">
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={phaseDesc} onChange={(e) => setPhaseDesc(e.target.value)} placeholder="例如：了解留学行业基础知识和公司制度" rows={3} />
          </Field>
        </Modal>
      )}

      {canEdit && openModuleModal && (
        <Modal title="添加培训日" onClose={() => setOpenModuleModal(false)} onSubmit={addModule} submitText="保存培训日">
          <Field label="培训日标题">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="例如：走进柯维（Kiwi）：品牌基因与价值观" />
          </Field>
          <Field label="所属阶段（可选）">
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={modulePhaseId ?? ""} onChange={(e) => setModulePhaseId(e.target.value ? e.target.value : null)}>
              <option value="">不归类（phase_id 为空）</option>
              {phasesOfDept.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {canEdit && openTaskModal && (
        <Modal title="添加任务" onClose={() => setOpenTaskModal(false)} onSubmit={addTask} submitText="保存任务">
          <Field label="任务标题">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="例如：研读《柯维留学事务所介绍册》，理解服务理念" />
          </Field>
          <Field label="任务类型">
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={taskType} onChange={(e) => setTaskType(e.target.value as any)}>
              <option value="team">固定课</option>
              <option value="homework">作业</option>
              <option value="self">自学</option>
              <option value="quiz">考核</option>
            </select>
          </Field>
          <Field label="所属培训日/模块">
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={taskModuleId ?? ""} onChange={(e) => setTaskModuleId(e.target.value ? e.target.value : null)}>
              <option value="">请选择</option>
              {modulesOfDept.map((m) => <option key={m.id} value={String(m.id)}>{m.title}</option>)}
            </select>
          </Field>
          <div className="text-xs text-slate-500">资料与题库入口已接回：task_materials / quiz_questions。</div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, onSubmit, submitText }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: () => void; submitText: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">取消</button>
          <button onClick={onSubmit} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700">{submitText}</button>
        </div>
      </div>
    </div>
  );
}
