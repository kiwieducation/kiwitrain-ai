"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm, PERMISSIONS, ROLES } from "@/lib/permissions";

type AnyRow = Record<string, any>;
type Dept = { id: string; name: string; sort_order: number | null; description?: string | null };

function cls(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function Modal({
  title,
  children,
  onClose,
  onSubmit,
  submitText,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitText: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            取消
          </button>
          <button onClick={onSubmit} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700">
            {submitText}
          </button>
        </div>
      </div>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function safeArray(v: any): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

export default function UsersPage() {
  const currentUser = useMemo(() => getSessionUser(), []);
  const canManage =
    !!currentUser && (currentUser.role === "admin" || hasPerm(currentUser as any, "manage_users"));

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AnyRow[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    role: "employee",
    department_id: "",
    custom_perms: [] as string[],
  });

  useEffect(() => {
    if (!currentUser) window.location.href = "/login";
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !canManage) {
      // 直接阻止进入
      window.location.href = "/dashboard";
    }
  }, [currentUser, canManage]);

  async function load() {
    setLoading(true);
    try {
      const deptRes = await supabase.from("departments").select("*").order("sort_order", { ascending: true });
      if (deptRes.error) throw deptRes.error;
      setDepts((deptRes.data ?? []) as Dept[]);

      const userRes = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (userRes.error) throw userRes.error;
      setUsers(userRes.data ?? []);
    } catch (e: any) {
      console.error("[users load error]", e);
      alert(e?.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return users;
    return users.filter((u) => {
      const name = String(u.name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const role = String(u.role ?? "").toLowerCase();
      const dept = String(u.department_id ?? "").toLowerCase();
      return name.includes(kw) || email.includes(kw) || role.includes(kw) || dept.includes(kw);
    });
  }, [users, q]);

  function openAdd() {
    setEditing(null);
    setForm({
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      name: "",
      email: "",
      role: "employee",
      department_id: "",
      custom_perms: [],
    });
    setOpen(true);
  }

  function openEdit(u: AnyRow) {
    setEditing(u);
    setForm({
      id: String(u.id ?? ""),
      name: String(u.name ?? ""),
      email: String(u.email ?? ""),
      role: String(u.role ?? "employee"),
      department_id: u.department_id != null ? String(u.department_id) : "",
      custom_perms: safeArray(u.custom_perms),
    });
    setOpen(true);
  }

  function defaultPermsForRole(role: string) {
    // 旧版：leader/admin_staff 默认有 perms，但 employee 通常为空
    // admin 用 all（但我们不强制写进 custom_perms）
    if (role === "admin") return [];
    const r = (ROLES as any)[role];
    if (!r) return [];
    // 旧版 ROLES[role].perms 里可能有 all；这里过滤掉 all
    return (r.perms ?? []).filter((p: string) => p !== "all");
  }

  function onRoleChange(role: string) {
    const nextDefault = defaultPermsForRole(role);
    setForm((f) => ({
      ...f,
      role,
      // 旧版：切换角色时 custom_perms 跟随默认权限（可再手动勾选）
      custom_perms: nextDefault,
    }));
  }

  function togglePerm(key: string) {
    setForm((f) => {
      const cur = f.custom_perms ?? [];
      const has = cur.includes(key);
      return { ...f, custom_perms: has ? cur.filter((x) => x !== key) : [...cur, key] };
    });
  }

  async function saveUser() {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!email) return alert("请输入邮箱");
    if (!name) return alert("请输入姓名");

    try {
      // 旧版：只有 leader/admin_staff/自定义权限 才保留 custom_perms；employee 默认 null
      const role = form.role;
      const custom =
        ["leader", "admin_staff"].includes(role) ? form.custom_perms : (form.custom_perms.length ? form.custom_perms : null);

      // upsert：有则更新，无则新增
      const payload: AnyRow = {
        id: form.id,
        name,
        email,
        role,
        department_id: form.department_id || null,
        custom_perms: custom,
      };

      const res = await supabase.from("users").upsert(payload, { onConflict: "id" });
      if (res.error) throw res.error;

      setOpen(false);
      await load();
    } catch (e: any) {
      console.error("[users save error]", e);
      alert(
        (e?.message ?? "保存失败") +
          "\n\n可能原因：users 表字段/约束不同（例如 id 不是主键、email 唯一等）。把报错贴我，我按你真实 schema 兼容。"
      );
    }
  }

  async function deleteUser(u: AnyRow) {
    if (!confirm(`确认删除员工：${u.name ?? u.email ?? u.id} ?`)) return;
    try {
      const res = await supabase.from("users").delete().eq("id", u.id);
      if (res.error) throw res.error;
      await load();
    } catch (e: any) {
      console.error("[users delete error]", e);
      alert(e?.message ?? "删除失败");
    }
  }

  if (!currentUser) return null;
  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">账号管理 Users</div>
          <div className="mt-1 text-sm text-slate-500">支持：角色 + custom_perms（对齐旧版权限系统）</div>
        </div>
        <button
          onClick={openAdd}
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
        >
          ＋ 添加员工
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索：姓名 / 邮箱 / 角色 / 部门"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            onClick={load}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-800">员工列表</div>
          <div className="text-xs text-slate-500">{loading ? "加载中..." : `共 ${filtered.length} 人`}</div>
        </div>

        <div className="p-5 space-y-3">
          {loading && <div className="text-sm text-slate-500">加载中...</div>}
          {!loading && filtered.length === 0 && <div className="text-sm text-slate-500">暂无员工</div>}

          {!loading &&
            filtered.map((u) => (
              <div key={String(u.id)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-slate-900">{u.name ?? "（未命名）"}</div>
                    <div className="text-sm text-slate-600">{u.email}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge>{String(u.role ?? "employee")}</Badge>
                      {u.department_id ? <Badge>dept:{String(u.department_id)}</Badge> : <Badge>无部门</Badge>}
                      {Array.isArray(u.custom_perms) && u.custom_perms.length > 0 ? (
                        <Badge>custom_perms:{u.custom_perms.length}</Badge>
                      ) : (
                        <Badge>custom_perms:0</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-100"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {open && (
        <Modal
          title={editing ? "编辑员工" : "添加员工"}
          onClose={() => setOpen(false)}
          onSubmit={saveUser}
          submitText="保存"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="姓名">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="例如：张三"
              />
            </Field>

            <Field label="邮箱（登录账号）">
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="例如：xxx@company.com"
              />
            </Field>

            <Field label="角色 role">
              <select
                value={form.role}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="admin">admin（管理员）</option>
                <option value="leader">leader（组长）</option>
                <option value="admin_staff">admin_staff（行政）</option>
                <option value="employee">employee（员工）</option>
              </select>
            </Field>

            <Field label="部门 department_id">
              <select
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">不设置</option>
                {depts.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800">自定义权限 custom_perms</div>
              <div className="text-xs text-slate-500">
                旧版规则：先看 custom_perms，再回落默认角色权限；admin 永远 all
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PERMISSIONS.map((perm) => {
                const checked = (form.custom_perms ?? []).includes(perm.key);
                return (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePerm(perm.key)}
                    className={cls(
                      "text-left rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      checked
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{perm.label}</span>
                      <span className={cls("text-xs", checked ? "text-emerald-700" : "text-slate-400")}>
                        {checked ? "✓ 已启用" : "未启用"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{perm.key}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500">
              提示：你想让“旧账号员工也能看到 Training 的新增按钮”，就给它勾选 <b>edit_training</b>。
              <br />
              想让员工看到 Dashboard（团队进度），就勾选 <b>view_team_progress</b>。
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
