import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { objectToFormData } from "@/lib/form-utils";
import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OpType } from "@/constants/common";

type EndpointMap = {
  get?: string;
  create?: string;
  delete?: string;
  softDelete?: string;
  edit?: string;
  common?: string;
};

type UseFormCrudManagerProps<T> = {
  queryKey: string;
  endpoint: EndpointMap;
  updateMethod?: "put" | "patch";
  transformInitialData?: (data: T) => T;
  extraInvalidationKeys?: Array<unknown[]>;
  extraRemoveQueriesKeys?: Array<unknown[]>;
  useFormData?: boolean;
};

/**
 * Generic CRUD state machine for feature-level form/list screens.
 *
 * Manages: open/close dialog, selected item, optimistic invalidation,
 * and all four CRUD mutations (create, update, soft-delete, delete).
 */
export const useFormCrudManager = <
  T extends { id?: string | number | undefined | null; message?: string }
>(
  options: UseFormCrudManagerProps<T>
) => {
  const [openFormPopup, setOpenFormPopup] = React.useState(false);
  const [opTypeState, setOpTypeState] = useState<OpType>(OpType.Add);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Partial<T> | null>(null);
  // Use Partial<T> instead of `T | {}` so TypeScript keeps the shape useful.
  const [initialData, setInitialData] = useState<Partial<T>>({});

  const queryClient = useQueryClient();

  const {
    queryKey,
    endpoint,
    updateMethod = "patch",
    extraInvalidationKeys = [],
    extraRemoveQueriesKeys = [],
    useFormData = false,
  } = options;

  const preparePayload = (data: Partial<T>): Partial<T> | FormData => {
    if (!useFormData) return data;
    return objectToFormData(data as Record<string, unknown>);
  };

  // ── Internal fetch helpers ─────────────────────────────────────────────────

  const fetchById = async (): Promise<T> => {
    const endpointToUse = endpoint.get ?? endpoint.common;
    if (!endpointToUse) {
      return Promise.reject(
        new Error("Endpoint for fetching by ID is not defined")
      );
    }
    const response = await apiClient.get(`${endpointToUse}/${selectedItem?.id}`);
    if (response.status !== 200) throw new Error("Error fetching data");
    return response.data?.data ?? response.data;
  };

  const fetchCreate = async (data: Partial<T>): Promise<T> => {
    const endpointToUse = endpoint.create ?? endpoint.common;
    if (!endpointToUse) {
      return Promise.reject(
        new Error("Endpoint for creating is not defined")
      );
    }
    const payload = preparePayload(data);
    const response = await apiClient.post(endpointToUse, payload);
    if (response.status !== 201 && response.status !== 200) {
      throw new Error("Error creating data");
    }
    return response.data?.data ?? response.data;
  };

  const fetchUpdate = async (data: Partial<T>): Promise<T> => {
    const endpointToUse = endpoint.edit ?? endpoint.common;
    if (!endpointToUse) {
      return Promise.reject(
        new Error("Endpoint for updating is not defined")
      );
    }
    const payload = preparePayload(data);
    const response =
      updateMethod === "patch"
        ? await apiClient.patch(`${endpointToUse}/${selectedItem?.id}`, payload)
        : await apiClient.put(`${endpointToUse}/${selectedItem?.id}`, payload);
    if (response.status !== 200) throw new Error("Error updating data");
    return response.data?.data ?? response.data;
  };

  const fetchDelete = async (): Promise<T> => {
    const endpointToUse = endpoint.delete ?? endpoint.common;
    if (!endpointToUse) {
      return Promise.reject(
        new Error("Endpoint for deleting is not defined")
      );
    }
    const response = await apiClient.delete(
      `${endpointToUse}/${selectedItem?.id}`
    );
    if (response.status !== 200) throw new Error("Error deleting data");
    return response.data;
  };

  const fetchSoftDelete = async (): Promise<T> => {
    const endpointToUse = endpoint.softDelete ?? endpoint.common;
    if (!endpointToUse) {
      return Promise.reject(
        new Error("Endpoint for soft-deleting is not defined")
      );
    }
    const response = await apiClient.post(
      `${endpointToUse}/${selectedItem?.id}`
    );
    if (response.status !== 200) throw new Error("Error soft-deleting data");
    return response.data;
  };

  // ── Query & Mutations ──────────────────────────────────────────────────────

  const getById = useQuery({
    queryKey: [queryKey, selectedItem?.id],
    queryFn: () => fetchById(),
    enabled: !!selectedItem?.id,
  });

  /** Invalidate list + extra keys after any write operation. */
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: [`${queryKey}-list`] });
    extraInvalidationKeys.forEach((key) => {
      void queryClient.invalidateQueries({ queryKey: key });
    });
    extraRemoveQueriesKeys.forEach((key) => {
      void queryClient.removeQueries({ queryKey: key });
    });
  };

  const createRecord = useMutation({
    mutationKey: [`create-${queryKey}`],
    mutationFn: (data: Partial<T>) => fetchCreate(data),
    onSuccess: () => {
      toast.success("Created successfully!");
      invalidateAll();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error creating data";
      toast.error(message);
    },
  });

  const updateRecord = useMutation({
    mutationKey: [`update-${queryKey}`, selectedItem?.id],
    mutationFn: (data: Partial<T>) => fetchUpdate(data),
    onSuccess: () => {
      toast.success("Updated successfully!");
      void queryClient.invalidateQueries({
        queryKey: [queryKey, selectedItem?.id],
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error updating data";
      toast.error(message);
    },
  });

  const deleteRecord = useMutation({
    mutationKey: [`delete-${queryKey}`, selectedItem?.id],
    mutationFn: () => fetchDelete(),
    onSuccess: () => {
      toast.success("Deleted successfully!");
      invalidateAll();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error deleting data";
      toast.error(message);
    },
  });

  const softDeleteRecord = useMutation({
    mutationKey: [`soft-delete-${queryKey}`, selectedItem?.id],
    mutationFn: () => fetchSoftDelete(),
    onSuccess: () => {
      toast.success("Deleted successfully!");
      invalidateAll();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error deleting data";
      toast.error(message);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onRowAction = (action: string, row: T) => {
    setSelectedItem(row);
    if (action === OpType.Edit) {
      setOpTypeState(OpType.Edit);
      setOpenFormPopup(true);
    } else if (action === OpType.View) {
      setOpTypeState(OpType.View);
      setOpenFormPopup(true);
    } else if (action === OpType.SoftDelete || action === OpType.Delete) {
      setDeleteDialogOpen(true);
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteRecord
      .mutateAsync()
      .then(() => {
        setDeleteDialogOpen(false);
        setSelectedItem(null);
      })
      .catch((err: unknown) => {
        console.error("[useFormCrudManager] handleDelete failed:", err);
      });
  };

  const handleSoftDelete = () => {
    if (!selectedItem) return;
    softDeleteRecord
      .mutateAsync()
      .then(() => {
        setDeleteDialogOpen(false);
        setSelectedItem(null);
      })
      .catch((err: unknown) => {
        console.error("[useFormCrudManager] handleSoftDelete failed:", err);
      });
  };

  const handleEdit = async (data: Partial<T>): Promise<T | undefined> => {
    if (!selectedItem) return;
    try {
      const res = await updateRecord.mutateAsync(data);
      setOpenFormPopup(false);
      return res;
    } catch (err: unknown) {
      console.error("[useFormCrudManager] handleEdit failed:", err);
      throw err;
    }
  };

  const handleCreate = async (data: Partial<T>): Promise<T> => {
    try {
      const res = await createRecord.mutateAsync(data);
      setOpenFormPopup(false);
      return res;
    } catch (err: unknown) {
      console.error("[useFormCrudManager] handleCreate failed:", err);
      throw err;
    }
  };

  const onAddNew = () => {
    setSelectedItem(null);
    setOpTypeState(OpType.Add);
    setOpenFormPopup(true);
  };

  // Sync initialData when the fetched record or selected item changes.
  // Store transformInitialData in a ref to avoid infinite re-render loops from inline arrow functions.
  const transformRef = React.useRef(options.transformInitialData);
  useEffect(() => {
    transformRef.current = options.transformInitialData;
  });

  useEffect(() => {
    if (opTypeState !== OpType.Add) {
      let data: Partial<T> = getById.data ?? selectedItem ?? {};
      if (getById.data && transformRef.current) {
        data = transformRef.current(getById.data as T);
      }
      setInitialData(data);
    } else {
      setInitialData({});
    }
  }, [getById.data, opTypeState, selectedItem]);

  return {
    data: getById.data,
    isLoading: getById.isLoading,
    isError: getById.isError,
    error: getById.error,
    createRecord: createRecord.mutateAsync,
    isCreating: createRecord.isPending,
    isCreatingSuccess: createRecord.isSuccess,
    createdRecord: createRecord.data,
    updateRecord: updateRecord.mutateAsync,
    isUpdating: updateRecord.isPending,
    isUpdatingSuccess: updateRecord.isSuccess,
    deleteRecord: deleteRecord.mutateAsync,
    isDeleting: deleteRecord.isPending,
    isDeleteSuccess: deleteRecord.isSuccess,
    softDeleteRecord: softDeleteRecord.mutateAsync,
    isSoftDeleting: softDeleteRecord.isPending,
    isSoftDeleteSuccess: softDeleteRecord.isSuccess,
    initialData,
    openFormPopup,
    opTypeState,
    deleteDialogOpen,
    setOpenFormPopup,
    setDeleteDialogOpen,
    setOpTypeState,
    selectedItem,
    setSelectedItem,
    handleDelete,
    handleSoftDelete,
    handleCreate,
    handleEdit,
    onRowAction,
    onAddNew,
  };
};
