import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkshopById,
  getWorkshopRegistrations,
  registerAttendee,
  cancelRegistration,
} from "./api";
import type {
  RegistrationFormData,
  RegistrationListFilters,
  Workshop,
} from "./types";

export function useWorkshop(workshopId: string | number) {
  return useQuery({
    queryKey: ["workshop", String(workshopId)],
    queryFn: () => getWorkshopById(workshopId),
    enabled: !!workshopId,
  });
}

export function useWorkshopRegistrations(
  workshopId: string | number,
  filters: RegistrationListFilters
) {
  return useQuery({
    queryKey: ["registrations", String(workshopId), filters],
    queryFn: () => getWorkshopRegistrations(workshopId, filters),
    enabled: !!workshopId,
  });
}

export function useRegisterAttendee(workshopId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegistrationFormData) =>
      registerAttendee(workshopId, payload),
    onSuccess: (result) => {
      // Optimistically update workshop cache with fresh seat counts from response
      if (result.workshop) {
        queryClient.setQueryData<Workshop>(
          ["workshop", String(workshopId)],
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              capacity: result.workshop.capacity,
              active_count: result.workshop.active_count,
              seats_left: result.workshop.seats_left,
              is_full: result.workshop.is_full,
            };
          }
        );
      }

      // Invalidate queries to refresh lists
      void queryClient.invalidateQueries({
        queryKey: ["workshop", String(workshopId)],
      });
      void queryClient.invalidateQueries({
        queryKey: ["registrations", String(workshopId)],
      });
      void queryClient.invalidateQueries({
        queryKey: ["workshops-list"],
      });
    },
  });
}

export function useCancelRegistration(workshopId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      registrationId,
      reason,
    }: {
      registrationId: string | number;
      reason?: string;
    }) => cancelRegistration(registrationId, reason),
    onSuccess: (result) => {
      // Optimistically update workshop cache with fresh seat counts from response
      if (result.workshop) {
        queryClient.setQueryData<Workshop>(
          ["workshop", String(workshopId)],
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              capacity: result.workshop.capacity,
              active_count: result.workshop.active_count,
              seats_left: result.workshop.seats_left,
              is_full: result.workshop.is_full,
            };
          }
        );
      }

      // Invalidate queries to refresh lists
      void queryClient.invalidateQueries({
        queryKey: ["workshop", String(workshopId)],
      });
      void queryClient.invalidateQueries({
        queryKey: ["registrations", String(workshopId)],
      });
      void queryClient.invalidateQueries({
        queryKey: ["workshops-list"],
      });
    },
  });
}
