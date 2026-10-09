"use client";

import * as React from "react";
import { Button as ShadButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

export const customButtonVariants = cva(
    "inline-flex items-center justify-center rounded-md font-[500]  cursor-pointer duration-300  transition",
    {
        variants: {
            variant: {
                primary:
                    " text-white rounded-[6px] bg-buttonPrimaryDefault hover:bg-buttonPrimaryHover active:bg-buttonPrimaryClicked focus:bg-buttonPrimaryFocus disabled:bg-buttonPrimaryDisabled",
                secondary:
                    " text-white rounded-[6px] bg-buttonSecondaryDefault hover:bg-buttonSecondaryHover active:bg-buttonSecondaryClicked focus:bg-buttonSecondaryFocus disabled:bg-buttonSecondaryDisabled",
                tertiary:
                    "text-white rounded-[6px] bg-buttonTertiaryDefault hover:bg-buttonTertiaryHover active:bg-buttonTertiaryClicked focus:bg-buttonTertiaryFocus disabled:bg-buttonTertiaryDisabled",
                dangerPrimary:
                    "text-white bg-buttonDangerPrimaryDefault hover:bg-buttonDangerPrimaryHover active:bg-buttonDangerPrimaryClicked focus:bg-buttonDangerPrimaryFocus disabled:bg-buttonDangerPrimaryDisabled",
                dangerSecondary:
                    "text-white bg-buttonDangerSecondaryDefault hover:bg-buttonDangerSecondaryHover active:bg-buttonDangerSecondaryClicked focus:bg-buttonDangerSecondaryFocus disabled:bg-buttonDangerSecondaryDisabled",
                ghost:
                    "text-white bg-buttonGhostDefault hover:bg-buttonGhostHover active:bg-buttonGhostClicked focus:bg-buttonGhostFocus disabled:bg-buttonGhostDisabled text-primary border border-primary disabled:text-gray-500 disabled:border-gray-500 ",
                nonStatePrimary: " text-primary bg-transparent hover:bg-transparent ",
                nonStateSecondary:
                    " text-gray-500 bg-transparent hover:bg-transparent ",
                outline:
                    "border border-secondary  bg-background text-black shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                outlineDanger:
                    "border border-red-200 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
            },
            size: {
                sm: " px-2 py-1 text-xs rounded-[4px] min-w-7 min-h-6",
                lg: " px-6 py-2.5 text-sm has-[>svg]:px-6 ",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "lg",
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof customButtonVariants> { }

export function Button({ variant, size, className, ...props }: ButtonProps) {
    return (
        <ShadButton
            className={cn(customButtonVariants({ variant, size }), className)}
            {...props}
        />
    );
}
