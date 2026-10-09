import { apiClient } from "@/lib/api-client";
import type {
  Registration,
  RegistrationMutationResponse,
  Workshop,
  Paginated,
  RegistrationFormData,
  RegistrationListFilters,
} from "./types";

export async function getWorkshopById(workshopId: string | number): Promise<Workshop> {
  const response = await apiClient.get<Workshop | { data: Workshop }>(`/workshops/${workshopId}`);
  const data = response.data;
  return (data && "data" in data && data.data ? data.data : data) as Workshop;
}

export async function getWorkshopRegistrations(
  workshopId: string | number,
  params: RegistrationListFilters = {}
): Promise<Paginated<Registration>> {
  const response = await apiClient.get<Paginated<Registration>>(
    `/workshops/${workshopId}/registrations`,
    { params }
  );
  return response.data;
}

export async function registerAttendee(
  workshopId: string | number,
  payload: RegistrationFormData
): Promise<RegistrationMutationResponse> {
  const cleanPayload = {
    attendee_name: payload.attendee_name.trim(),
    attendee_email: payload.attendee_email.trim().toLowerCase(),
  };

  const response = await apiClient.post<RegistrationMutationResponse>(
    `/workshops/${workshopId}/registrations`,
    cleanPayload
  );
  return response.data;
}

export async function cancelRegistration(
  registrationId: string | number,
  reason?: string
): Promise<RegistrationMutationResponse> {
  const payload = reason?.trim() ? { reason: reason.trim() } : {};
  const response = await apiClient.post<RegistrationMutationResponse>(
    `/registrations/${registrationId}/cancel`,
    payload
  );
  return response.data;
}
