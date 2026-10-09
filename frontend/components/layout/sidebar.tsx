"use client";

import * as React from "react";
import {
    LogOut,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { uiMessages } from "@/lib/messages";
import { getNavItemsForRole, type NavItem } from "@/components/layout/nav-items";

// Helper to check route active status
function isRouteActive(itemHref: string, currentPathname: string): boolean {
    if (itemHref === "/workshops") {
        return (
            currentPathname === "/workshops" ||
            (currentPathname.startsWith("/workshops/") && currentPathname !== "/workshops/new")
        );
    }
    return currentPathname === itemHref || currentPathname.startsWith(itemHref + "/");
}

// Sub-component: Standalone Nav Item
function NavStandaloneItem({
    item,
    effectiveCollapsed,
    onCloseMobile,
}: {
    item: NavItem;
    effectiveCollapsed: boolean;
    onCloseMobile?: () => void;
}) {
    const pathname = usePathname();
    const isActive = isRouteActive(item.href, pathname);
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            onClick={onCloseMobile}
            title={effectiveCollapsed ? item.title : undefined}
            className={cn(
                "relative flex items-center rounded-xl text-sm font-semibold transition-all group",
                effectiveCollapsed
                    ? "justify-center p-3"
                    : "justify-between px-3.5 py-2.5",
                isActive
                    ? "text-secondary font-bold bg-muted/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
        >
            {isActive && !effectiveCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-secondary rounded-r-full" />
            )}

            <div
                className={cn(
                    "flex items-center gap-3 truncate",
                    effectiveCollapsed && "justify-center"
                )}
            >
                <Icon
                    aria-hidden="true"
                    className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive
                            ? "text-secondary"
                            : "text-muted-foreground group-hover:text-foreground"
                    )}
                />
                {!effectiveCollapsed && <span className="truncate">{item.title}</span>}
            </div>
        </Link>
    );
}

// Main Sidebar Component
export function Sidebar({
    className,
    onCloseMobile,
    isMobile = false,
}: {
    className?: string;
    onCloseMobile?: () => void;
    isMobile?: boolean;
}) {
    const { data: session } = useSession();
    const navItems = getNavItemsForRole(session?.user?.role);

    const [isCollapsed, setIsCollapsed] = React.useState(false);

    React.useEffect(() => {
        if (!isMobile) {
            const saved = localStorage.getItem("sidebar_collapsed");
            if (saved !== null) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsCollapsed(saved === "true");
            }
        }
    }, [isMobile]);

    const toggleCollapse = () => {
        if (isMobile) return;
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("sidebar_collapsed", String(next));
            return next;
        });
    };

    const effectiveCollapsed = isMobile ? false : isCollapsed;

    return (
        <aside
            className={cn(
                "flex flex-col border border-border/40 bg-card text-card-foreground select-none shrink-0 h-full justify-between shadow-xs overflow-y-auto relative bg-primary transition-all duration-300 ease-in-out",
                effectiveCollapsed
                    ? "w-20 p-3 rounded-[22px] lg:rounded-[26px]"
                    : "w-64 lg:w-68 p-5 lg:p-6 rounded-[22px] lg:rounded-[26px]",
                className
            )}
        >
            {/* Top Group: Brand Header & Main Navigation */}
            <div className="flex flex-col">
                {/* Top Brand Header */}
                <div
                    className={cn(
                        "flex items-center mb-6 relative",
                        effectiveCollapsed ? "justify-center flex-col gap-2 py-2" : "justify-between px-2 py-3"
                    )}
                >
                    <div className="flex items-center gap-3 truncate">
                        <div className="h-10 w-10 rounded-2xl bg-secondary text-primary-foreground flex items-center justify-center font-black shadow-xs shrink-0">
                            <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
                        </div>
                        {!effectiveCollapsed && (
                            <div className="flex flex-col truncate">
                                <span className="text-xl font-extrabold tracking-tight text-secondary leading-none">
                                    Kenora
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    {uiMessages.appName}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Toggle Button (Desktop only) */}
                    {!isMobile && (
                        <button
                            type="button"
                            onClick={toggleCollapse}
                            title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className={cn(
                                "h-8 w-8 rounded-xl bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                effectiveCollapsed && "mt-1"
                            )}
                        >
                            {effectiveCollapsed ? (
                                <ChevronRight aria-hidden="true" className="h-4 w-4" />
                            ) : (
                                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Navigation Sections */}
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <NavStandaloneItem
                            key={item.href}
                            item={item}
                            effectiveCollapsed={effectiveCollapsed}
                            onCloseMobile={onCloseMobile}
                        />
                    ))}
                </nav>
            </div>

            {/* Bottom Group: Logout */}
            <div className="pt-4 mt-auto border-t border-border/20">
                <button
                    type="button"
                    title={effectiveCollapsed ? "Logout" : undefined}
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "flex items-center w-full rounded-xl text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors group cursor-pointer text-left",
                        effectiveCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
                    )}
                >
                    <LogOut aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-destructive transition-colors" />
                    {!effectiveCollapsed && <span className="truncate">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
