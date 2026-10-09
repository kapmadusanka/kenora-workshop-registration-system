"use client";

import * as React from "react";
import { FieldPath, FieldValues, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useOptionalFormCrudContext } from "@/context/form-crud.context";
import { OpType } from "@/constants/common";
import { UploadCloud, X, ImageIcon } from "lucide-react";
import { cn } from "cn";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormImageUploadProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  /** Hint text shown inside the drop zone when empty. */
  hint?: string;
  /** Accepted MIME types, e.g. "image/png,image/jpeg". Default: "image/*". */
  accept?: string;
  /** Max file size in bytes. Default: 5 MB. */
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEFAULT_ACCEPT = "image/*";
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * A form-connected image upload field.
 *
 * - Supports click-to-browse and drag-and-drop.
 * - Previews the selected file immediately, and also previews an existing
 *   remote URL when the field already has a value (edit / view mode).
 * - Stores the image as a base64 data-URL string in the RHF field value,
 *   keeping it compatible with `z.string().nullable()` schemas.
 * - Automatically goes read-only when `FormCrudContext` is in `OpType.View`.
 */
export function FormImageUpload<T extends FieldValues>({
  name,
  label,
  hint = "Click or drag & drop an image here",
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = DEFAULT_MAX_BYTES,
  disabled,
  className,
}: FormImageUploadProps<T>) {
  const { control } = useFormContext<T>();
  const crudCtx = useOptionalFormCrudContext<T>();

  const isReadOnly = disabled || crudCtx?.opType === OpType.View;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [sizeError, setSizeError] = React.useState<string | null>(null);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // The field value is either a base64 data-URL (freshly picked) or
        // a remote URL string (loaded from the backend).
        const previewSrc: string | null =
          typeof field.value === "string" && field.value.length > 0
            ? field.value
            : null;

        const handleFile = async (file: File) => {
          setSizeError(null);
          if (file.size > maxSizeBytes) {
            setSizeError(
              `File is too large (${formatBytes(file.size)}). Maximum allowed: ${formatBytes(maxSizeBytes)}.`
            );
            return;
          }
          try {
            const dataUrl = await readFileAsDataUrl(file);
            field.onChange(dataUrl);
          } catch {
            setSizeError("Failed to read the selected file. Please try again.");
          }
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset input so the same file can be re-selected after clearing.
          e.target.value = "";
        };

        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragging(false);
          if (isReadOnly) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        };

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          if (!isReadOnly) setIsDragging(true);
        };

        const handleDragLeave = () => setIsDragging(false);

        const handleClear = (e: React.MouseEvent) => {
          e.stopPropagation();
          setSizeError(null);
          field.onChange(null);
        };

        const handleClick = () => {
          if (!isReadOnly) inputRef.current?.click();
        };

        return (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="space-y-2">
                {/* ── Drop Zone ─────────────────────────────────────────── */}
                <div
                  role={isReadOnly ? undefined : "button"}
                  tabIndex={isReadOnly ? undefined : 0}
                  aria-label={isReadOnly ? undefined : `Upload ${label}`}
                  onClick={handleClick}
                  onKeyDown={(e) => {
                    if (!isReadOnly && (e.key === "Enter" || e.key === " ")) {
                      handleClick();
                    }
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden",
                    previewSrc ? "h-44 border-border" : "h-36 border-border/60",
                    !isReadOnly &&
                      !previewSrc &&
                      "cursor-pointer hover:border-primary/60 hover:bg-primary/5",
                    isDragging &&
                      "border-primary bg-primary/10 scale-[1.01]",
                    isReadOnly && "cursor-default opacity-80",
                    sizeError && "border-destructive"
                  )}
                >
                  {previewSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSrc}
                        alt="Preview"
                        className="h-full w-full object-contain"
                      />
                      {/* Overlay on hover (edit mode only) */}
                      {!isReadOnly && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                          <UploadCloud className="h-6 w-6 text-white" />
                          <span className="text-xs text-white font-semibold">
                            Click to replace
                          </span>
                        </div>
                      )}
                      {/* Clear button */}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={handleClear}
                          aria-label="Remove image"
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors z-10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 py-2 text-center pointer-events-none select-none">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {isDragging ? (
                          <UploadCloud className="h-5 w-5 text-primary animate-bounce" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isDragging ? "Drop image here…" : hint}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        PNG, JPG, WEBP · Max {formatBytes(maxSizeBytes)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Hidden native file input */}
                <input
                  ref={inputRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  disabled={isReadOnly}
                  onChange={handleInputChange}
                  aria-hidden
                />

                {/* Size / read error (local, outside RHF validation) */}
                {sizeError && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {sizeError}
                  </p>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
