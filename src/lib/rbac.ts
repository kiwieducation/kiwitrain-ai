import type { PermissionKey, Role, UserRow } from "./types";

export const ROLES: Record<Role, { label: string; perms: PermissionKey[] | ["all"] }> = {
  admin: { label: "管理员", perms: ["all"] },
  leader: {
    label: "组长",
    perms: ["edit_training", "upload_resources", "view_team_progress", "approve_homework"],
  },
  admin_staff: { label: "行政", perms: ["manage_users"] },
  employee: { label: "员工", perms: [] },
};

export function hasPerm(user: UserRow | null | undefined, perm: PermissionKey) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.custom_perms && Array.isArray(user.custom_perms)) return user.custom_perms.includes(perm);
  const rolePerms = ROLES[user.role]?.perms ?? [];
  if ((rolePerms as any).includes?.("all")) return true;
  return (rolePerms as PermissionKey[]).includes(perm);
}

export function isLeader(user: UserRow | null | undefined) {
  return user?.role === "leader";
}

export function isAdminLike(user: UserRow | null | undefined) {
  return user ? ["admin", "admin_staff"].includes(user.role) : false;
}
