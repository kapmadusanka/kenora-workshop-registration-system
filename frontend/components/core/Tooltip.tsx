"use client";

import * as React from "react";
import {
  Tooltip as BaseTooltip,
  TooltipTrigger as BaseTooltipTrigger,
  TooltipContent as BaseTooltipContent,
  TooltipProvider as BaseTooltipProvider,
} from "@/components/ui/tooltip";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  enabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = "top",
  enabled = true,
}: TooltipProps) {
  if (!enabled || !content) {
    return <>{children}</>;
  }

  return (
    <BaseTooltipProvider>
      <BaseTooltip>
        <BaseTooltipTrigger>{children}</BaseTooltipTrigger>
        <BaseTooltipContent side={side}>{content}</BaseTooltipContent>
      </BaseTooltip>
    </BaseTooltipProvider>
  );
}
