import * as React from "react";
import { cn } from "@/lib/utils";
import {Typography} from "@/components/core/typography";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2",
        className
      )}
    >
      <div className="space-y-1">
        <Typography className="text-2xl font-black tracking-tight text-foreground">
          {title}
        </Typography>
        {subtitle && (
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
