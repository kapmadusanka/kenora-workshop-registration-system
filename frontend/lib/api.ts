import { signOut } from "next-auth/react";
import type { ApiError } from "@/types";

export class ApiException extends Error implements ApiError {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.errors = errors;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `/api/proxy${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      await signOut({ redirectTo: "/login" });
    }
    throw new ApiException(401, "Session expired. Please sign in again.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || "An unexpected API error occurred.";
    const errors = data?.errors;
    throw new ApiException(res.status, message, errors);
  }

  return data as T;
}
