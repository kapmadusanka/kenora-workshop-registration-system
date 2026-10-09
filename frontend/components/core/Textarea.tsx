import * as React from "react";
import { Textarea as BaseTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<typeof BaseTextarea>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <BaseTextarea
      className={cn(
        "rounded-xl border-border/80 focus-visible:ring-primary/20",
        className
      )}
      {...props}
    />
  );
}
