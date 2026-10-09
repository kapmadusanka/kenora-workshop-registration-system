"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export function Providers({
                              children,
                          }: {
    children: React.ReactNode;
}) {
    const [queryClient] = React.useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <SessionProvider>
            <NextThemesProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                themes={["light", "dark"]}
            >
                    <QueryClientProvider client={queryClient}>
                        {children}
                    </QueryClientProvider>
            </NextThemesProvider>
        </SessionProvider>
    );
}
