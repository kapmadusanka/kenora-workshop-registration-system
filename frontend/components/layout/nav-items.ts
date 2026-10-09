import { can, type PermissionAction } from "@/lib/permissions";
import type { Role } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  action: PermissionAction;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Workshops",
    href: "/workshops",
    action: "view_workshops",
  },
  {
    title: "Users",
    href: "/admin/users",
    action: "create_users",
  },
];

export function getNavItemsForRole(role?: Role | null): NavItem[] {
  return NAV_ITEMS.filter((item) => can(item.action, role));
}
