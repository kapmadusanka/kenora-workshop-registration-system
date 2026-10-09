"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Loader2, ShieldAlert } from "lucide-react";
import {redirect} from "next/navigation";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const [mobileOpen, setMobileOpen] = React.useState(false);

    React.useEffect(() => {
        if (status === "unauthenticated") {
            redirect('/access-denied')
        }
    }, [status]);

    if (status === "loading") {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-3 selection:bg-primary">
                <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md border border-border/50">
                    <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                </div>
                <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    Verifying security clearance...
                </p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
                <ShieldAlert className="h-8 w-8 text-destructive animate-pulse" />
                <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    Access denied. Redirecting to authorization portal...
                </p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-muted/40 p-2.5 sm:p-3.5 lg:p-4 flex gap-3 sm:gap-4 overflow-hidden select-none">
            {/* 1. Standalone Floating Sidebar Card */}
            <Sidebar className="hidden lg:flex" />

            {/* Mobile Slide-out Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="relative z-10 w-72 max-w-[85vw] h-full p-2.5 shadow-2xl animate-in slide-in-from-left duration-200">
                        <Sidebar isMobile onCloseMobile={() => setMobileOpen(false)} className="w-full h-full" />
                    </div>
                </div>
            )}

            {/* Right Column: Independent TopNav Card & Main Container Card */}
            <div className="flex-1 flex flex-col min-w-0 gap-3 sm:gap-4 h-full overflow-hidden">
                {/* 2. Standalone Floating TopNav Card */}
                <TopNav onToggleMobileMenu={() => setMobileOpen(true)} />

                {/* 3. Standalone Floating Main Content Card */}
                <main className="flex-1 rounded-[22px] lg:rounded-[26px] bg-card border border-border/40 shadow-xs overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="w-full mx-auto space-y-6  space-x-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
