"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";

type AnyRow = Record<string, any>;

function pick(row: AnyRow, keys: string[]) {
  for (const k of keys) if (row && row[k] != null) return row[k];
  return undefined;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export default function ResourcesPage() {
  const user = useMemo(() => getSessionUser(), []);
  const canUpload = !!user && (user.role === "admin" || hasPerm(user, "upload_resources"));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AnyRow[]>([]);
  const [q, setQ] = useState("");

  // upload modal
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    if (!user) window.location.href = "/login";
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      // 兼容字段：title/name，url/link/file_url
      // 这里先全量拉，后面再做分页
      const res = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      if (res.error) throw res.error;
      setItems(res.data ?? []);
    } catch (e: any) {
      console.error("[resources load error]", e);
      alert(e?.message ?? "加载资料失败：请确认存在 resources 表");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((r) => {
      const t = String(pick(r, ["title", "name", "resource_title"]) ?? "").toLowerCase();
      const d = String(pick(r, ["description", "desc", "summary"]) ?? "").toLowerCase();
      const tg = String(pick(r, ["tag", "tags", "category"]) ?? "").toLowerCase();
      return t.includes(kw) || d.includes(kw) || tg.includes(kw);
    });
  }, [items, q]);

  async function addResource() {
    const t = title.trim();
    const u = url.trim();
    if (!t) return alert("请输入资料标题");
    if (!u) return alert("请输入链接/URL");

    try {
      // 最稳妥：先尝试常见字段 title/url/tag
      let ins = await supabase.from("resources").insert({
        title: t,
        url: u,
        tag: tag.trim() || null,
        created_by: user?.id ?? null,
      });

      // 如果字段不匹配，就退化：只写 title/url
      if (ins.error) {
        ins = await supabase.from("resources").insert({ title: t, url: u });
      }
      if (ins.error) throw ins.error;

      setOpen(false);
      setTitle("");
      setUrl("");
      setTag("");
      await load();
    } catch (e: any) {
      console.error("[resources add error]", e);
      alert(
        (e?.message ?? "新增失败") +
          "\n\n可能原因：resources 表字段不是 title/url/tag。把报错贴我，我按真实字段兼容。"
      );
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-slate-900">资料库</div>
            {canUpload ? <Badge>可上传</Badge> : <Badge>仅查看</Badge>}
          </div>
          <div className="mt-1 text-sm text-slate-500">管理培训学习资料（旧版功能迁移中）</div>
        </div>

        {canUpload && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
          >
            ＋ 上传资料
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索资料（标题/描述/标签）"
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
          <div className="font-semibold text-slate-800">资料列表</div>
          <div className="text-xs text-slate-500">{loading ? "加载中..." : `共 ${filtered.length} 条`}</div>
        </div>

        <div className="p-5 space-y-3">
          {loading && <div className="text-sm text-slate-500">加载中...</div>}
          {!loading && filtered.length === 0 && <div className="text-sm text-slate-500">暂无资料</div>}

          {!loading &&
            filtered.map((r, idx) => {
              const t = pick(r, ["title", "name", "resource_title"]) ?? `资料 ${idx + 1}`;
              const u = pick(r, ["url", "link", "href", "file_url"]);
              const d = pick(r, ["description", "desc", "summary"]);
              const tg = pick(r, ["tag", "tags", "category"]);
              return (
                <div key={r.id ?? idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-900">{String(t)}</div>
                      {d ? <div className="mt-1 text-sm text-slate-600">{String(d)}</div> : null}
                      {tg ? <div className="mt-2"><Badge>{String(tg)}</Badge></div> : null}
                    </div>
                    {u ? (
                      <a
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        href={String(u)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        打开
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">无链接字段</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold">上传资料（简化版）</div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <div className="font-semibold text-slate-800">拖拽上传（下一步接 Supabase Storage）</div>
                <div className="mt-1 text-sm text-slate-500">
                  现在先支持：把资料作为“链接”保存到 resources 表
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">资料标题</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：签约转化 SOP"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">资料链接 / URL</div>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="例如：https://..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">标签（可选）</div>
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="例如：销售/签约/案例"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="text-xs text-slate-500">
                如果你旧版 resources 字段不是 title/url/tag，我会按你库里的真实字段做兼容。
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                取消
              </button>
              <button onClick={addResource} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
