"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const mounted = React.useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    if (!mounted) {
        return (
            <div className="h-10 w-10 rounded-full border border-border/70 bg-card shrink-0" />
        );
    }

    const currentTheme = theme === "system" ? resolvedTheme : theme;
    const isDark = currentTheme === "dark";

    const toggleTheme = () => {
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="h-10 w-10 rounded-full border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Moon className="h-4 w-4 text-sky-400" />
            ) : (
                <Sun className="h-4 w-4 text-amber-500" />
            )}
        </button>
    );
}
