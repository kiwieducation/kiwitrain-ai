"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { getSessionUser } from "../lib/session";
import { hasPerm } from "../lib/permissions";
import { isLeader as isLeaderFn } from "../lib/rbac";
import type { UserRow } from "../lib/types";

type Department = { id: string; name: string; sort_order: number | null };
type TrainingModule = {
  id: string;
  department_id: string;
  sort_order: number | null;
  day_number?: number | null;
  title?: string | null;
};
type TrainingTask = {
  id: string;
  module_id: string;
  sort_order: number | null;
  title?: string | null;
};
type ProgressRow = { user_id: string; task_id: string; status?: string | null; completed?: boolean | null };

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function pct(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function Icon({
  name,
  className,
}: {
  name: "dashboard" | "book" | "check" | "users" | "building" | "sparkle";
  className?: string;
}) {
  const c = className ?? "h-5 w-5";
  if (name === "dashboard") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-18v7h7V2h-7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "book") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M7 4v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "building") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20V6a2 2 0 0 1 2-2h7v16H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path
          d="M13 10h5a2 2 0 0 1 2 2v8h-7V10Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7 8h3M7 12h3M7 16h3M16 14h2M16 17h2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l1.2 4.3L18 8l-4.8 1.7L12 14l-1.2-4.3L6 8l4.8-1.7L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M19 14l.7 2.4L22 17l-2.3.6L19 20l-.7-2.4L16 17l2.3-.6L19 14Z"
        str
