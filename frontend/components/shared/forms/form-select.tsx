"use client";

import { FieldPath, FieldValues, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOptionalFormCrudContext } from "@/context/form-crud.context";
import { OpType } from "@/constants/common";

export interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  options: FormSelectOption[];
  placeholder?: string;
  /** Explicitly disable the field regardless of opType. */
  disabled?: boolean;
  className?: string;
}

/**
 * A form-connected Radix UI select field.
 *
 * Automatically inherits read-only behaviour when inside a
 * `FormCrudProvider` set to `OpType.View`.
 */
export function FormSelect<T extends FieldValues>({
  name,
  label,
  options,
  placeholder = "Select an option",
  disabled,
  className,
}: FormSelectProps<T>) {
  const { control } = useFormContext<T>();
  const crudCtx = useOptionalFormCrudContext<T>();

  const isReadOnly = disabled || crudCtx?.opType === OpType.View;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(val) => field.onChange(val)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent side="bottom">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
