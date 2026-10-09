import React, { createContext, useContext, useState } from "react";
import {OpType} from "@/constants/common";

export type FormCrudContextType<T> = {
    open: boolean;
    opType: OpType;
    initialData: Partial<T>;
    selectedItem: Partial<T> | null;
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    openForm: () => void;
    closeForm: () => void;
    handleCreate: (data: Partial<T>) => Promise<unknown> | void;
    handleEdit: (data: Partial<T>) => Promise<unknown> | void;
    setOpType?: (opType: OpType) => void;
    setSelectedItem?: (item: Partial<T> | null) => void;
    setOpen?: (open: boolean) => void;
};

export const FormCrudContext = createContext<FormCrudContextType<unknown> | null>(null);

export const useOptionalFormCrudContext = <T,>() => {
    return useContext(FormCrudContext) as FormCrudContextType<T> | null;
};

export const useFormCrudContext = <T,>() => {
    const ctx = useContext(FormCrudContext);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    if (!ctx) {
        throw new Error("useFormCrudContext must be used inside FormCrudProvider");
    }
    return {
        ...(ctx as FormCrudContextType<T>),
        isFormDirty,
        setIsFormDirty,
        showWarning,
        setShowWarning,
    };
};

export const FormCrudProvider = <T,>({
                                         value,
                                         children,
                                     }: {
    value: FormCrudContextType<T>;
    children: React.ReactNode;
}) => {
    return (
        <FormCrudContext.Provider value={value}>
            {children}
        </FormCrudContext.Provider>
    );
};
