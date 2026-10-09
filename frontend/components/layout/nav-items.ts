import { can, type PermissionAction } from "@/lib/permissions";
import type { Role } from "@/types";
import { CalendarDays, CalendarPlus, Users, History, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  action: PermissionAction;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Workshops",
    href: "/workshops",
    action: "view_workshops",
    icon: CalendarDays,
  },
  {
    title: "New Workshop",
    href: "/workshops/new",
    action: "edit_workshops",
    icon: CalendarPlus,
  },
  {
    title: "Users",
    href: "/admin/users",
    action: "create_users",
    icon: Users,
  },
  {
    title: "Audit Log",
    href: "/admin/audit-logs",
    action: "audit.view",
    icon: History,
  },
];

export function getNavItemsForRole(role?: Role | null): NavItem[] {
  return NAV_ITEMS.filter((item) => can(item.action, role));
}
