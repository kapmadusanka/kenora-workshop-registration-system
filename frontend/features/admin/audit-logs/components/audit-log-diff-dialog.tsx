"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/core/Button";
import { getAuditActionLabel } from "@/lib/messages";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "../types";

export interface AuditLogDiffDialogProps {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

function sanitizeDiffValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes("password") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("token")
  ) {
    return "changed";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function AuditLogDiffDialog({
  log,
  open,
  onClose,
}: AuditLogDiffDialogProps) {
  if (!log) return null;

  const oldVals = log.old_values ?? {};
  const newVals = log.new_values ?? {};
  const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Audit Log Diff: {getAuditActionLabel(log.action)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Metadata pill */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground">Entity: </span>
              <span className="font-semibold text-foreground capitalize">
                {log.entity_type} #{log.entity_id}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Actor: </span>
              <span className="font-semibold text-foreground">
                {log.user?.name || "System"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Timestamp: </span>
              <span className="font-medium text-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </div>
          </div>

          {/* Diff table */}
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2">Changed Fields</h4>
            {allKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-lg bg-muted/20">
                No individual field changes recorded.
              </p>
            ) : (
              <div className="border border-border/70 rounded-xl overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/70 border-b border-border/70 text-left text-muted-foreground font-semibold">
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Previous Value</th>
                      <th className="p-2.5">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {allKeys.map((key) => {
                      const oldVal = sanitizeDiffValue(key, oldVals[key]);
                      const newVal = sanitizeDiffValue(key, newVals[key]);
                      return (
                        <tr key={key} className="hover:bg-muted/30">
                          <td className="p-2.5 font-mono text-[11px] font-semibold text-foreground">
                            {key}
                          </td>
                          <td className="p-2.5 text-muted-foreground font-mono text-[11px] break-all">
                            {oldVal}
                          </td>
                          <td className="p-2.5 text-foreground font-semibold font-mono text-[11px] break-all">
                            {newVal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
