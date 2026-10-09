"use client";

import * as React from "react";
import {
    LayoutDashboard,
    ClipboardList,
    Users,
    Settings,
    HelpCircle,
    LogOut,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    type LucideIcon, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {uiMessages} from "@/lib/messages";

// --- Nav Data Models ---
type NavItem = {
    labelKey: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
};

type NavGroup = {
    labelKey: string;
    icon: LucideIcon;
    children: NavItem[];
};

type SidebarSection =
    | { type: "standalone"; item: NavItem }
    | { type: "group"; group: NavGroup }
    | { type: "divider"; labelKey: string };

// --- Exact Target Navigation Hierarchy ---
const SIDEBAR_CONFIG: SidebarSection[] = [
    {
        type: "standalone",
        item: {
            labelKey: "dashboard",
            href: "/admin/dashboard",
            icon: LayoutDashboard,
        },
    },
    {
        type: "standalone",
        item: {
            labelKey: "workshops",
            href: "/admin/workshops",
            icon: CalendarDays,
        },
    },
    {
        type: "standalone",
        item: {
            labelKey: "registrations",
            href: "/admin/registrations",
            icon: ClipboardList,
        },
    },
    {
        type: "standalone",
        item: {
            labelKey: "users",
            href: "/users",
            icon: Users,
        },
    },
];

const GENERAL_ITEMS: NavItem[] = [
    {
        labelKey: "settings",
        href: "/settings",
        icon: Settings,
    },
    {
        labelKey: "help",
        href: "/help",
        icon: HelpCircle,
    },
];


// Helper to check route active status
function isRouteActive(itemHref: string, currentPathname: string): boolean {
    if (itemHref === "/dashboard") {
        return (
            currentPathname === "/" ||
            currentPathname === "/dashboard" ||
            currentPathname === ""
        );
    }
    return currentPathname.startsWith(itemHref);
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
    const labelText = item.labelKey;

    return (
        <Link
            href={item.href}
            onClick={onCloseMobile}
            title={effectiveCollapsed ? labelText : undefined}
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
                {!effectiveCollapsed && <span className="truncate">{labelText}</span>}
            </div>

            {!effectiveCollapsed && item.badge && (
                <span
                    className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        isActive
                            ? "bg-secondary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20"
                    )}
                >
          {item.badge}
        </span>
            )}
        </Link>
    );
}

// Sub-component: Child Nav Item inside a Group
function NavChildItem({
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
    const labelText =  item.labelKey;

    return (
        <div role="listitem">
            <Link
                href={item.href}
                onClick={onCloseMobile}
                title={effectiveCollapsed ? labelText : undefined}
                className={cn(
                    "relative flex items-center rounded-xl text-xs font-semibold transition-all group",
                    effectiveCollapsed
                        ? "justify-center p-2.5"
                        : "justify-between pl-9 pr-3.5 py-2",
                    isActive
                        ? "text-secondary font-bold bg-muted/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
            >
                {isActive && !effectiveCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-secondary rounded-r-full" />
                )}

                <div
                    className={cn(
                        "flex items-center gap-2.5 truncate",
                        effectiveCollapsed && "justify-center"
                    )}
                >
                    <Icon
                        aria-hidden="true"
                        className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                                ? "text-secondary"
                                : "text-muted-foreground group-hover:text-foreground"
                        )}
                    />
                    {!effectiveCollapsed && <span className="truncate">{labelText}</span>}
                </div>
            </Link>
        </div>
    );
}

// Sub-component: Nav Group (Expandable Parent Header + Children Container)
function NavGroupItem({
                          group,
                          isOpen,
                          onToggle,
                          effectiveCollapsed,
                          onCloseMobile,
                      }: {
    group: NavGroup;
    isOpen: boolean;
    onToggle: () => void;
    effectiveCollapsed: boolean;
    onCloseMobile?: () => void;
}) {
    const pathname = usePathname();

    const hasActiveChild = group.children.some((child) =>
        isRouteActive(child.href, pathname)
    );

    const GroupIcon = group.icon;
    let groupLabel = group.labelKey;
    try {
        groupLabel = group.labelKey;
    } catch {
        groupLabel = group.labelKey;
    }

    const groupId = `nav-group-${group.labelKey}`;

    return (
        <div className="space-y-1">
            {/* Group Header Button */}
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={groupId}
                title={effectiveCollapsed ? groupLabel : undefined}
                className={cn(
                    "w-full flex items-center rounded-xl text-sm font-semibold transition-all group cursor-pointer text-left",
                    effectiveCollapsed
                        ? "justify-center p-3"
                        : "justify-between px-3.5 py-2.5",
                    hasActiveChild
                        ? "text-secondary font-bold bg-muted/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
            >
                <div
                    className={cn(
                        "flex items-center gap-3 truncate",
                        effectiveCollapsed && "justify-center"
                    )}
                >
                    <GroupIcon
                        aria-hidden="true"
                        className={cn(
                            "h-5 w-5 shrink-0 transition-colors",
                            hasActiveChild
                                ? "text-secondary"
                                : "text-muted-foreground group-hover:text-foreground"
                        )}
                    />
                    {!effectiveCollapsed && (
                        <span className="truncate">{groupLabel}</span>
                    )}
                </div>

                {!effectiveCollapsed && (
                    <ChevronDown
                        aria-hidden="true"
                        className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                )}
            </button>

            {/* Children Container (Collapsible) */}
            <div
                id={groupId}
                role="list"
                style={{ maxHeight: isOpen ? "600px" : "0px", overflow: "hidden" }}
                className="transition-all duration-200 ease-in-out space-y-1"
            >
                {group.children.map((child) => (
                    <NavChildItem
                        key={child.href}
                        item={child}
                        effectiveCollapsed={effectiveCollapsed}
                        onCloseMobile={onCloseMobile}
                    />
                ))}
            </div>
        </div>
    );
}

// Sub-component: Section Divider / Label
function NavDivider({ labelKey, effectiveCollapsed }: { labelKey: string; effectiveCollapsed: boolean }) {
    if (effectiveCollapsed) {
        return <div className="h-px bg-border/20 my-2 mx-2" />;
    }

    return (
        <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/70">
            {labelKey}
        </div>
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
    const pathname = usePathname();

    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (!isMobile) {
            const saved = localStorage.getItem("sidebar_collapsed");
            if (saved !== null) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsCollapsed(saved === "true");
            }
        }
    }, [isMobile]);

    // Auto-expand group containing active route on mount / route change
    React.useEffect(() => {
        SIDEBAR_CONFIG.forEach((section) => {
            if (section.type === "group") {
                const hasActive = section.group.children.some((child) =>
                    isRouteActive(child.href, pathname)
                );
                if (hasActive) {
                    setOpenGroups((prev) => ({
                        ...prev,
                        [section.group.labelKey]: true,
                    }));
                }
            }
        });
    }, [pathname]);

    const toggleCollapse = () => {
        if (isMobile) return;
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("sidebar_collapsed", String(next));
            return next;
        });
    };

    const toggleGroup = (key: string) => {
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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
                    {SIDEBAR_CONFIG.map((section, idx) => {
                        if (section.type === "standalone") {
                            return (
                                <NavStandaloneItem
                                    key={section.item.href}
                                    item={section.item}
                                    effectiveCollapsed={effectiveCollapsed}
                                    onCloseMobile={onCloseMobile}
                                />
                            );
                        }

                        if (section.type === "group") {
                            return (
                                <NavGroupItem
                                    key={section.group.labelKey}
                                    group={section.group}
                                    isOpen={!!openGroups[section.group.labelKey]}
                                    onToggle={() => toggleGroup(section.group.labelKey)}
                                    effectiveCollapsed={effectiveCollapsed}
                                    onCloseMobile={onCloseMobile}
                                />
                            );
                        }

                        if (section.type === "divider") {
                            return (
                                <NavDivider
                                    key={idx}
                                    labelKey={section.labelKey}
                                    effectiveCollapsed={effectiveCollapsed}
                                />
                            );
                        }

                        return null;
                    })}
                </nav>
            </div>

            {/* Bottom Group: GENERAL */}
            <div className="space-y-1 pt-4 mt-4 border-t border-border/20">
                <NavDivider labelKey="GENERAL" effectiveCollapsed={effectiveCollapsed} />

                <nav className="space-y-1">
                    {GENERAL_ITEMS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <a
                                key={item.labelKey}
                                href={item.href}
                                title={effectiveCollapsed ? item.labelKey : undefined}
                                onClick={(e) => {
                                    if (item.href.startsWith("#")) {
                                        e.preventDefault();
                                    }
                                    onCloseMobile?.();
                                }}
                                className={cn(
                                    "flex items-center rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors group cursor-pointer",
                                    effectiveCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
                                )}
                            >
                                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                                {!effectiveCollapsed && <span className="truncate">{item.labelKey === "settings" ? "Settings" : "Help & Support"}</span>}
                            </a>
                        );
                    })}

                    {/* Logout Button */}
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
                        {!effectiveCollapsed && <span className="truncate">{ "Logout"}</span>}
                    </button>
                </nav>
            </div>
        </aside>
    );
}
