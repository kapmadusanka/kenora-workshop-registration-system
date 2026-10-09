import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
