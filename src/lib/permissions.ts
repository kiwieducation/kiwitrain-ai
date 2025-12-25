export const ROLES: Record<
  string,
  { label: string; perms: string[] }
> = {
  admin: { label: "管理员", perms: ["all"] },
  leader: {
    label: "组长",
    perms: ["edit_training", "upload_resources", "view_team_progress", "approve_homework"],
  },
  admin_staff: { label: "行政", perms: ["manage_users"] },
  employee: { label: "员工", perms: [] },
};

export const PERMISSIONS = [
  { key: "edit_training", label: "编辑培训计划" },
  { key: "upload_resources", label: "上传资料" },
  { key: "manage_users", label: "管理员工" },
  { key: "view_team_progress", label: "查看团队进度" },
  { key: "approve_homework", label: "审批作业" },
  { key: "sales_dep_access", label: "访问销售顾问工作台" },
] as const;

export function hasPerm(user: any, perm: string) {
  if (!user?.role) return false;
  const role = ROLES[user.role];
  if (!role) return false;

  // admin: all
  if (role.perms.includes("all")) return true;

  // custom_perms override
  if (Array.isArray(user.custom_perms)) {
    return user.custom_perms.includes(perm);
  }

  // default role perms
  return role.perms.includes(perm);
}
