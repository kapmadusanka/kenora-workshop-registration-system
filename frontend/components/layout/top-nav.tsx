"use client";

import * as React from "react";
import { ThemeToggle } from "./theme-toggle";
import { Search, Mail, Bell, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function TopNav({
                           className,
                           onToggleMobileMenu,
                       }: {
    className?: string;
    onToggleMobileMenu?: () => void;
}) {
    const { data: session } = useSession();
    const userName =
        (session?.user?.name
            ? `${session.user.name}`
            : session?.user?.name) ||
        "Authorized User";
    const userEmail = session?.user?.email || "user@admin.lk";
    const userRole = session?.user?.role || "User";

    return (
        <header
            className={cn(
                "h-16 sm:h-18 px-4 sm:px-6 flex items-center justify-between gap-4 rounded-[20px] lg:rounded-[24px] bg-card border border-border/40 shadow-xs shrink-0 select-none",
                className
            )}
        >
            {/* Left: Mobile Menu Button & Search Pill */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
                {onToggleMobileMenu && (
                    <button
                        type="button"
                        onClick={onToggleMobileMenu}
                        className="lg:hidden h-10 w-10 rounded-full border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-xs"
                        title="Open Menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                )}

                {/* Pill Search Input */}
                <div className="relative flex items-center w-full">
                    <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search task"
                        className="w-full h-10 sm:h-11 pl-10 pr-12 rounded-full bg-card border border-border/70 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
                    />
                    <kbd className="absolute right-3 text-[10px] font-bold bg-muted/60 border border-border/60 px-1.5 py-0.5 rounded-md text-muted-foreground pointer-events-none select-none">
                        ⌘F
                    </kbd>
                </div>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                {/* Mail / Inbox Button */}
                <button
                    type="button"
                    onClick={() => alert("No unread messages.")}
                    className="h-10 w-10 rounded-full border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-xs"
                    title="Messages"
                >
                    <Mail className="h-4 w-4" />
                </button>

                {/* Notification Bell Button with Indicator */}
                <button
                    type="button"
                    onClick={() => alert("You are up to date. No new notifications.")}
                    className="h-10 w-10 rounded-full border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative cursor-pointer shrink-0 shadow-xs"
                    title="Notifications"
                >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-card" />
                </button>

                <ThemeToggle />

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-1 sm:pl-2">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-sm border border-border/70 shrink-0 shadow-xs">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:flex flex-col text-left overflow-hidden max-w-[140px]">
            <span className="text-sm font-bold text-foreground leading-tight truncate">
              {userName}
            </span>
                        <span className="text-xs text-muted-foreground leading-tight truncate">
              {userEmail}
            </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
