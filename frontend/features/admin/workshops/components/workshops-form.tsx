"use client";
import {FormDialog} from "@/components/shared/forms/form-dialog";
import {UseFormReturn} from "react-hook-form";
import {useRef} from "react";
import {OpType} from "@/constants/common";
import {useFormCrudContext} from "@/context/form-crud.context";
import {FormInput} from "@/components/shared/forms/form-input";
import {WorkshopSchema} from "@/features/admin/workshops/schemas/workshop-schema";
import {Workshop} from "@/features/admin/workshops/types/workshops-types";

const WorkshopForm=()=>{
    const { opType, selectedItem, handleEdit, handleCreate } = useFormCrudContext<Workshop>();
    const { id } = selectedItem || {};
    const formRef = useRef<UseFormReturn<Workshop>>(null);

    const onSubmit = async (data: Workshop) => {
        const postData = {
            ...data,
        };

        if (id && opType === OpType.Edit) {
            handleEdit?.({ id, ...postData });
        } else {
            handleCreate?.(postData);
        }
    };
    return <>

        <FormDialog formRef={formRef} schema={WorkshopSchema}  onSubmit={onSubmit}>
            <>
                <FormInput
                    name="name"
                    label="Name*"
                    placeholder="Enter Workshop name"
                />

                <FormInput
                    name="description"
                    label="Description"
                    placeholder="Enter Workshop description"
                />
            </>
        </FormDialog>
    </>
}
export default WorkshopForm;
