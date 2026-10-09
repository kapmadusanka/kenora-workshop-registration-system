"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Spinner } from "@/components/ui/spinner";
import {Button, customButtonVariants} from "@/components/core/Button";

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof customButtonVariants> {}

type LoadingButtonProps = {
    isLoading: boolean;
    isLoadingText?: string;
} & ButtonProps;

export function LoadingButton({
                                  className,
                                  isLoading,
                                  isLoadingText,
                                  ...props
                              }: LoadingButtonProps) {
    return (
        <Button
            className={className}
            {...props}
            disabled={isLoading || props.disabled}
        >
            {isLoading ? (
                isLoadingText ? (
                    <>
                        <Spinner />
                        {isLoadingText}
                    </>
                ) : (
                    <>
                        <Spinner />
                        loading...
                    </>
                )
            ) : (
                props.children
            )}
        </Button>
    );
}
