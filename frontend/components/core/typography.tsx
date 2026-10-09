"use client";

import React from "react";
import { cn } from "@/lib/utils";

const typographyVariants = {
    h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    h2: "scroll-m-20 text-3xl font-semibold tracking-tight",
    h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    h4: "scroll-m-20 text-xl font-semibold tracking-tight",
    heading1: "text-xl font-medium",
    heading2: "text-lg font-medium",
    subtitle1: "text-base font-medium",
    subtitle2: "text-sm font-medium",
    body1: "text-xs",
    body2: "text-xs text-muted-foreground",
    caption: "text-xs text-muted-foreground",
    overline: "text-xs uppercase tracking-wider text-muted-foreground",
} as const;

export type TypographyVariant = keyof typeof typographyVariants;

export type TypographyElement = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "label" | "small";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: TypographyVariant;
    className?: string;
    children?: React.ReactNode;
    component?: TypographyElement;
}

export const Typography: React.FC<TypographyProps> = ({
                                                          variant = "body1",
                                                          className,
                                                          children,
                                                          component = "p",
                                                          ...props
                                                      }) => {
    const Component = component;

    return (
        <Component className={cn(typographyVariants[variant], className)} {...props}>
            {children}
        </Component>
    );
};

export { typographyVariants };
