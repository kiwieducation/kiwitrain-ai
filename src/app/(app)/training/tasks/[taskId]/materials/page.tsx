"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
}

async function detectFkColumn(table: string) {
  // Try task_id first, fallback to training_task_id (compat)
  let probe: any = await supabase.from(table).select("id,task_id").limit(1);
if (!probe.error) return "task_id" as const;

probe = await supabase.from(table).select("id,training_task_id").limit(1);
if (!probe.error) return "training_task_id" as const;

  // last resort: still return task_id, and let insert/show error for us
  return "task_id" as const;
}

export default function TaskMaterialsPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = String(params?.taskId ?? "");
  const router = useRouter();
  const user = useMemo(() => getSessionUser(), []);
  const canEdit =
    !!user &&
    (user.role === "admin" ||
      user.role === "leader" ||
      (user as any).custom_perms?.includes?.("edit_training"));

  const [fkCol, setFkCol] = useState<"task_id" | "training_task_id">("task_id");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"link" | "resource">("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const fk = await detectFkColumn("task_materials");
      setFkCol(fk);

      const res = await supabase
        .from("task_materials")
        .select("*")
        .eq(fk, taskId)
        .order("sort_order", { ascending: true });

      if (res.error) {
        console.error("[materials load error]", res.error);
      }
      setItems(res.data ?? []);

      // resources list (optional, for selecting from library)
      const r = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      setResources(r.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function add() {
    if (!canEdit) return;
    if (saving) return;

    if (mode === "link") {
      if (!title.trim() || !url.trim()) return;
    } else {
      if (!resourceId) return;
    }

    setSaving(true);
    try {
      // ✅ 对齐旧版字段：external_title/external_url/resource_id/sort_order
      const payload: any =
        mode === "link"
          ? {
              [fkCol]: taskId,
              external_title: title.trim(),
              external_url: url.trim(),
              sort_order: items.length,
            }
          : {
              [fkCol]: taskId,
              resource_id: resourceId,
              sort_order: items.length,
            };

      let ins = await supabase.from("task_materials").insert(payload);

      // 如果字段名不对，打印错误并给我们改
      if (ins.error) {
        console.error("[materials insert error]", {
          message: ins.error.message,
          details: (ins.error as any).details,
          hint: (ins.error as any).hint,
          code: (ins.error as any).code,
          payload,
        });
        alert("新增失败：请把控制台的 [materials insert error] 贴给我，我按真实字段兼容。");
        return;
      }

      setTitle("");
      setUrl("");
      setResourceId("");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: any) {
    if (!canEdit) return;
    if (!confirm("确定删除该资料？")) return;

    const d = await supabase.from("task_materials").delete().eq("id", id);
    if (d.error) {
      console.error("[materials delete error]", d.error);
      alert("删除失败：请把控制台错误贴给我。");
      return;
    }
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">任务资料</div>
          <div className="text-sm text-slate-500 mt-1">
            对齐旧版：task_materials（link 用 external_title/external_url；库资料用 resource_id；按 sort_order 排序）
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            返回
          </button>
          <Link
            href="/training"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            去 Training
          </Link>
        </div>
      </div>

      {canEdit ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("link")}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                mode === "link" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              添加链接
            </button>
            <button
              onClick={() => setMode("resource")}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                mode === "resource" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              从资料库选择
            </button>
          </div>

          {mode === "link" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-700">标题</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：公司介绍手册"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-700">链接</div>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-700">选择资料</div>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">请选择</option>
                {resources.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {String(pick(r, ["title", "name"]) ?? r.id)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={add}
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "添加资料"}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            当前外键列：<b>{fkCol}</b>（自动检测 task_id / training_task_id）
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          你没有编辑权限：仅可查看。
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold">资料列表</div>
        <div className="p-4 space-y-3">
          {loading && <div className="text-sm text-slate-500">加载中...</div>}
          {!loading && items.length === 0 && <div className="text-sm text-slate-500">暂无资料</div>}

          {!loading &&
            items.map((it, idx) => {
              const t = pick(it, ["external_title", "title", "name", "material_title"]) ?? `资料 ${idx + 1}`;
              const u = pick(it, ["external_url", "url", "link", "href", "file_url"]);
              const rid = pick(it, ["resource_id"]);
              return (
                <div key={String(it.id ?? idx)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold break-words">{String(t)}</div>

                      {u ? (
                        <a className="text-sm text-emerald-700 underline break-all" href={String(u)} target="_blank" rel="noreferrer">
                          {String(u)}
                        </a>
                      ) : rid ? (
                        <div className="text-sm text-slate-600">来自资料库：{String(rid)}</div>
                      ) : (
                        <div className="text-sm text-slate-500">（无链接字段，显示原始数据）</div>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => del(it.id)}
                        className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        删除
                      </button>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    sort_order: {String(it.sort_order ?? "")} · id: {String(it.id ?? "")}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
