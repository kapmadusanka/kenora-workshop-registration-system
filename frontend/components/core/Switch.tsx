"use client";

import * as React from "react";
import { Switch as BaseSwitch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type SwitchProps = React.ComponentProps<typeof BaseSwitch>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch
      className={cn("cursor-pointer data-checked:bg-primary", className)}
      {...props}
    />
  );
}
