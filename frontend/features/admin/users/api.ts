import { apiClient } from "@/lib/api-client";
import type { User, CreateUserFormData, UpdateUserFormData, UserFilterState } from "./types";
import type { Paginated } from "@/types";

export async function getUsers(
  params: UserFilterState & { page?: number; per_page?: number } = {}
): Promise<Paginated<User>> {
  const response = await apiClient.get<Paginated<User>>("/users", { params });
  return response.data;
}

export async function createUser(payload: CreateUserFormData): Promise<User> {
  const cleanPayload = {
    ...payload,
    email: payload.email.trim().toLowerCase(),
    name: payload.name.trim(),
  };
  const response = await apiClient.post<User | { data: User }>("/users", cleanPayload);
  const data = response.data;
  return (data && "data" in data && data.data ? data.data : data) as User;
}

export async function updateUser(
  id: number | string,
  payload: UpdateUserFormData
): Promise<User> {
  const cleanPayload: Record<string, unknown> = {
    name: payload.name.trim(),
    role: payload.role,
    is_active: payload.is_active,
  };

  if (payload.password && payload.password.trim().length > 0) {
    cleanPayload.password = payload.password.trim();
  }

  const response = await apiClient.patch<User | { data: User }>(`/users/${id}`, cleanPayload);
  const data = response.data;
  return (data && "data" in data && data.data ? data.data : data) as User;
}
