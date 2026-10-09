import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface PrimaryButtonProps
  extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

export function PrimaryButton({
  children,
  className,
  disabled,
  loading = false,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      className={cn(className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
