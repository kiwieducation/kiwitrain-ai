export type Role = "admin" | "leader" | "admin_staff" | "employee";

export type PermissionKey =
  | "edit_training"
  | "upload_resources"
  | "manage_users"
  | "view_team_progress"
  | "approve_homework";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  department_id: string | null;
  custom_perms: PermissionKey[] | null;
  password?: string | null;
  password_changed?: boolean | null;
};

export type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
};

export type TrainingTaskRow = {
  id: string;
  module_id: string;
  title: string;
  task_type: "team" | "homework" | "self" | "quiz" | string;
  sort_order: number | null;
};

export type TrainingModuleRow = {
  id: string;
  department_id: string;
  title: string;
  sort_order: number | null;
  training_tasks?: TrainingTaskRow[];
};

export type UserTaskProgressRow = {
  id: string;
  user_id: string;
  task_id: string;
  is_completed: boolean;
  completed_at?: string | null;
};
