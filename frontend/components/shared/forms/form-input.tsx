"use client"

import {
    FieldPath,
    FieldValues,
    useFormContext,
} from "react-hook-form"

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

import { Input } from "@/components/ui/input"
import { useOptionalFormCrudContext } from "@/context/form-crud.context"
import { OpType } from "@/constants/common"

interface FormInputProps<T extends FieldValues> {
    name: FieldPath<T>
    label: string
    placeholder?: string
    type?: string
    disabled?: boolean
}

export function FormInput<T extends FieldValues>({
                                                     name,
                                                     label,
                                                     placeholder,
                                                     type = "text",
                                                     disabled,
                                                 }: FormInputProps<T>) {
    const { control } = useFormContext<T>()
    const crudCtx = useOptionalFormCrudContext<T>()

    const isReadOnly = disabled || crudCtx?.opType === OpType.View

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>

                    <FormControl>
                        <Input
                            {...field}
                            value={field.value ?? ""}
                            type={type}
                            placeholder={placeholder}
                            disabled={isReadOnly}
                        />
                    </FormControl>

                    <FormMessage />
                </FormItem>
            )}
        />
    )
}
