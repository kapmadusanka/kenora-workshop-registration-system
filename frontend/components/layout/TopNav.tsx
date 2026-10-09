"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";

import type { Role } from "@/types";
import { getNavItemsForRole } from "@/components/layout/nav-items";
import { RoleBadge } from "@/components/core/RoleBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/app/actions/auth";
import { uiMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

export interface TopNavProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const [isLoggingOut, startTransition] = React.useTransition();

  const navItems = getNavItemsForRole(user.role);

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: App Logo & Navigation Links */}
        <div className="flex items-center gap-8">
          <Link
            href={user.role === "admin" ? "/admin/users" : "/workshops"}
            className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-bold tracking-tight text-base">
              {uiMessages.appName}
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User info & Dropdown */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {user.name || user.email}
            </span>
            <RoleBadge role={user.role} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full relative size-9 hover:bg-muted inline-flex items-center justify-center cursor-pointer transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User menu"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <div className="pt-1.5 sm:hidden">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isLoggingOut}
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="size-4 mr-2" />
                <span>{isLoggingOut ? "Signing out..." : uiMessages.signOut}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
