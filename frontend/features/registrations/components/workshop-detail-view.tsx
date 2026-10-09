"use client";

import * as React from "react";
import { useWorkshop } from "@/features/registrations/hooks";
import { WorkshopHeaderCard } from "./workshop-header-card";
import { RegisterForm } from "./register-form";
import { RegistrationsList } from "./registrations-list";
import { Button } from "@/components/core/Button";
import { AlertCircle, RefreshCw } from "lucide-react";

export interface WorkshopDetailViewProps {
  workshopId: string | number;
}

export function WorkshopDetailView({ workshopId }: WorkshopDetailViewProps) {
  const { data: workshop, isLoading, isError, error, refetch } = useWorkshop(workshopId);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-muted/60" />
        <div className="h-48 rounded-2xl bg-muted/60" />
        <div className="h-96 rounded-2xl bg-muted/60" />
      </div>
    );
  }

  if (isError || !workshop) {
    return (
      <div className="p-12 border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="font-bold text-foreground text-lg">Workshop Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {(error as Error)?.message || "The requested workshop could not be found or failed to load."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkshopHeaderCard workshop={workshop} />
      <RegisterForm workshop={workshop} refetchWorkshop={refetch} />
      <RegistrationsList workshopId={workshop.id} />
    </div>
  );
}
