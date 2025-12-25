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
  let probe = await supabase.from(table).select("id,task_id").limit(1);
  if (!probe.error) return "task_id" as const;

  probe = await supabase.from(table).select("id,training_task_id").limit(1);
  if (!probe.error) return "training_task_id" as const;

  return "task_id" as const;
}

export default function TaskQuizPage() {
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

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"single" | "multi" | "text">("single");
  const [optionsText, setOptionsText] = useState(""); // JSON array or lines
  const [answersText, setAnswersText] = useState(""); // JSON array or string

  async function loadAll() {
    setLoading(true);
    try {
      const fk = await detectFkColumn("quiz_questions");
      setFkCol(fk);

      const res = await supabase
        .from("quiz_questions")
        .select("*")
        .eq(fk, taskId)
        .order("sort_order", { ascending: true });

      if (res.error) console.error("[quiz load error]", res.error);
      setItems(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function normalizeOptions(raw: string) {
    const s = raw.trim();
    if (!s) return null;

    // try JSON first
    try {
      const j = JSON.parse(s);
      return j;
    } catch {}

    // fallback: split lines
    const lines = s.split("\n").map((x) => x.trim()).filter(Boolean);
    return lines.length ? lines : null;
  }

  function normalizeAnswers(raw: string) {
    const s = raw.trim();
    if (!s) return null;

    // try JSON first
    try {
      return JSON.parse(s);
    } catch {}

    // fallback: string
    return s;
  }

  async function add() {
    if (!canEdit) return;
    if (saving) return;
    if (!questionText.trim()) return;

    setSaving(true);
    try {
      // ✅ 对齐旧版字段：question_text/question_type/options/correct_answers/sort_order
      const payload: any = {
        [fkCol]: taskId,
        question_text: questionText.trim(),
        question_type: questionType,
        options: normalizeOptions(optionsText),
        correct_answers: normalizeAnswers(answersText),
        sort_order: items.length,
      };

      let ins = await supabase.from("quiz_questions").insert(payload);

      if (ins.error) {
        console.error("[quiz insert error]", {
          message: ins.error.message,
          details: (ins.error as any).details,
          hint: (ins.error as any).hint,
          code: (ins.error as any).code,
          payload,
        });
        alert("新增失败：请把控制台的 [quiz insert error] 贴给我，我按真实字段兼容。");
        return;
      }

      setQuestionText("");
      setQuestionType("single");
      setOptionsText("");
      setAnswersText("");
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: any) {
    if (!canEdit) return;
    if (!confirm("确定删除该题目？")) return;

    const d = await supabase.from("quiz_questions").delete().eq("id", id);
    if (d.error) {
      console.error("[quiz delete error]", d.error);
      alert("删除失败：请把控制台错误贴给我。");
      return;
    }
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">任务考核题库</div>
          <div className="text-sm text-slate-500 mt-1">
            对齐旧版：quiz_questions（question_text / question_type / options / correct_answers / sort_order）
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
          <div className="flex items-center justify-between">
            <div className="font-semibold">新增题目</div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {showForm ? "收起" : "展开"}
            </button>
          </div>

          {showForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-700">题目内容（question_text）</div>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="请输入题目内容"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-700">题型（question_type）</div>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="single">single 单选</option>
                    <option value="multi">multi 多选</option>
                    <option value="text">text 主观</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-sm font-semibold text-slate-700">选项（options，可选：JSON 数组 或 每行一个）</div>
                  <textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder='例如：["A","B","C"]  或者每行一个选项'
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-700">正确答案（correct_answers，可选：JSON 或 字符串）</div>
                <input
                  value={answersText}
                  onChange={(e) => setAnswersText(e.target.value)}
                  placeholder='例如："A" 或 ["A","C"]'
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={add}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存题目"}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                当前外键列：<b>{fkCol}</b>（自动检测 task_id / training_task_id）
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          你没有编辑权限：仅可查看。
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold">题目列表</div>
        <div className="p-4 space-y-3">
          {loading && <div className="text-sm text-slate-500">加载中...</div>}
          {!loading && items.length === 0 && <div className="text-sm text-slate-500">暂无题目</div>}

          {!loading &&
            items.map((it, idx) => {
              const q = pick(it, ["question_text", "question", "title", "stem", "content"]) ?? `题目 ${idx + 1}`;
              const t = pick(it, ["question_type", "type"]) ?? "";
              const ops = pick(it, ["options"]);
              const ans = pick(it, ["correct_answers", "answer", "correct_answer"]);
              return (
                <div key={String(it.id ?? idx)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold break-words">{String(q)}</div>
                      {t ? <div className="text-xs text-slate-500 mt-1">type: {String(t)}</div> : null}
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

                  {ops != null && (
                    <div className="text-sm text-slate-700">
                      选项：<span className="break-all">{typeof ops === "string" ? ops : JSON.stringify(ops)}</span>
                    </div>
                  )}
                  {ans != null && (
                    <div className="text-sm text-slate-700">
                      答案：<span className="break-all">{typeof ans === "string" ? ans : JSON.stringify(ans)}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
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
