export const OpType = {
    None: "none",
    Add: "add",
    Edit: "edit",
    View: "view",
    Delete: "delete",
    SoftDelete: "softDelete",
} as const;

export type OpType = (typeof OpType)[keyof typeof OpType];
