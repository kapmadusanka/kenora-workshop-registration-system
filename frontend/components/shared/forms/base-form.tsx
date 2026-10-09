import { zodResolver } from "@hookform/resolvers/zod";
import React, { forwardRef, JSX, useEffect, useImperativeHandle } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { getDefaultValuesFromSchema } from "@/lib/form-utils";

type FormBaseProps<T extends z.ZodTypeAny> = {
  formId: string;
  schema: z.ZodType<z.infer<T>, z.ZodTypeDef, unknown>;
  defaultValues?: z.infer<T>;
  children: React.ReactNode;
  onSubmit: (data: z.infer<T>) => void;
  onInvalid?: (errors: unknown) => void;
  onFormDirtyChange?: (isDirty: boolean) => void;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
};

function FormBaseInner<T extends z.ZodTypeAny>(
  {
    formId,
    schema,
    defaultValues,
    children,
    onSubmit,
    onInvalid,
    onFormDirtyChange,
    mode = "onSubmit",
  }: FormBaseProps<T>,
  ref: React.Ref<UseFormReturn<z.infer<T>>>
) {
  // Derive defaults from the Zod schema when none are provided externally.
  const computedDefaultValues = React.useMemo(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      return defaultValues;
    }
    return getDefaultValuesFromSchema(schema);
  }, [defaultValues, schema]);

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: computedDefaultValues,
    mode,
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty },
  } = form;

  // Re-populate the form when default values change (e.g. when editing a record).
  useEffect(() => {
    if (computedDefaultValues) {
      reset(computedDefaultValues);
    }
  }, [computedDefaultValues, reset]);

  // Notify the parent when dirty state changes (used for unsaved-changes warnings).
  useEffect(() => {
    onFormDirtyChange?.(isDirty);
  }, [isDirty, onFormDirtyChange]);

  // Expose the form instance to the parent via a ref so it can call
  // watch/setValue/etc. without prop-drilling through every child.
  useImperativeHandle(ref, () => form);

  return (
    <FormProvider {...form}>
      <form id={formId} onSubmit={handleSubmit(onSubmit, onInvalid)}>
        {children}
      </form>
    </FormProvider>
  );
}

const FormBase = forwardRef(FormBaseInner) as <T extends z.ZodTypeAny>(
  props: FormBaseProps<T> & {
    ref?: React.Ref<UseFormReturn<z.infer<T>>>;
  }
) => JSX.Element;

export default FormBase;
