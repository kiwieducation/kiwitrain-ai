import type { UserRow } from "./types";

const KEY = "kiwitrain_current_user_v1";

export function getSessionUser(): UserRow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserRow;
  } catch {
    return null;
  }
}

export function setSessionUser(user: UserRow) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
