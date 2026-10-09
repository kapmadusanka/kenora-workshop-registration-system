import type { Role } from "@/types";

export type PermissionAction =
  | "create_users"
  | "edit_workshops"
  | "register_attendees"
  | "view_workshops"
  | "audit.view";

const PERMISSION_MATRIX: Record<PermissionAction, Record<Role, boolean>> = {
  create_users: {
    admin: true,
    manager: false,
    staff: false,
  },
  edit_workshops: {
    admin: false,
    manager: true,
    staff: false,
  },
  register_attendees: {
    admin: false,
    manager: true,
    staff: true,
  },
  view_workshops: {
    admin: false,
    manager: true,
    staff: true,
  },
  "audit.view": {
    admin: true,
    manager: false,
    staff: false,
  },
};

export function can(action: PermissionAction, role?: Role | null): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[action]?.[role] ?? false;
}

export function homePathFor(role?: Role | null): string {
  if (role === "admin") {
    return "/admin/users";
  }
  if (role === "manager" || role === "staff") {
    return "/workshops";
  }
  return "/login";
}
