"use client";

import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";

export default function SalesDepPage() {
  const user = getSessionUser();
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  const canAccess = user.role === "admin" || hasPerm(user as any, "sales_dep_access");

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-xl font-bold text-slate-800">无权限访问</div>
        <div className="mt-2 text-sm text-slate-500">
          仅管理员与顾问组可见（通过 custom_perms：sales_dep_access 控制）
        </div>
        <div className="mt-6">
          <Link className="text-emerald-700 underline" href="/dashboard">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-2xl font-bold text-slate-900">销售顾问 AI工作台</div>
      <div className="mt-2 text-sm text-slate-500">
        这里将承载：SOP 流程、话术库、客户推进、资料/模板、AI 生成与复盘（逐步完善）
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold">① SOP 流程</div>
          <div className="text-sm text-slate-500 mt-1">按阶段管理：获客→诊断→方案→签约→交付</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold">② 话术与模板</div>
          <div className="text-sm text-slate-500 mt-1">常见问题、异议处理、报价/合同模板</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold">③ AI 助手</div>
          <div className="text-sm text-slate-500 mt-1">根据客户信息生成建议与下一步</div>
        </div>
      </div>
    </div>
  );
}
