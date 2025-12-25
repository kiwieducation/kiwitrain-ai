"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { setSessionUser, getSessionUser } from "@/lib/session";
import type { UserRow } from "@/lib/types";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const domain = useMemo(() => "@mykiwiedu.com", []);

  useEffect(() => {
    const u = getSessionUser();
    if (u) window.location.href = "/dashboard";
  }, []);

  async function onLogin() {
    setErr(null);
    setLoading(true);
    try {
      const email = `${username.trim()}${domain}`.toLowerCase();
      const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (error) throw error;
      if (!data) return setErr("账号不存在");

      const user = data as UserRow & { password?: string | null };
      if ((user.password ?? "") !== pwd) return setErr("密码错误");

      setSessionUser({
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        role: user.role,
        department_id: user.department_id ?? null,
        custom_perms: (user.custom_perms as any) ?? null,
      });

      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e?.message ?? "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-100 p-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold">
            K
          </div>
          <div className="text-2xl font-semibold text-emerald-700">KiwiTrain AI</div>
          <div className="text-sm text-slate-500">柯维留学事务所培训系统</div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2 text-slate-700">企业邮箱</div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <input
                className="flex-1 px-4 py-3 outline-none"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div className="px-4 py-3 bg-slate-50 text-slate-500 border-l border-slate-200">
                {domain}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2 text-slate-700">密码</div>
            <input
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
              placeholder="请输入密码"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {err}
            </div>
          )}

          <button
            onClick={onLogin}
            disabled={loading || !username.trim() || !pwd}
            className="w-full rounded-2xl py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>

          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-slate-600">
            <div className="font-semibold text-emerald-700 mb-1">💡 首次登录提示</div>
            <div>初始密码：<span className="font-semibold">12345kiwi</span></div>
            <div>首次登录后请修改密码</div>
          </div>
        </div>
      </div>
    </div>
  );
}
