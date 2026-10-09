import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn(
    "[API Client] NEXT_PUBLIC_API_BASE_URL is not set. Falling back to /api/v1. " +
      "Set this variable in your .env.local for correct API routing."
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    Accept: "application/json",
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request Interceptor: Attach the JWT access token from the next-auth session.
// Previously read from localStorage (which was never populated), leaving every
// request unauthenticated. We now read it from the next-auth session directly.
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const session = await getSession();
      if (session?.accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }

    if (config.headers) {
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        // Let the browser/Axios automatically determine the multipart/form-data boundary
        delete config.headers["Content-Type"];
      } else if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response Interceptor: Normalize errors into a consistent ApiError shape
// and handle 401 Unauthorized by triggering a session sign-out.
apiClient.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError<{ message?: string; errors?: Record<string, string[]>; code?: string }>
  ) => {
    const data = error.response?.data;
    const apiError: ApiError = {
      statusCode: error.response?.status ?? 500,
      message:
        data?.message ??
        error.message ??
        "An unexpected network or server error occurred.",
      code: data?.code,
      errors: data?.errors,
      timestamp: new Date().toISOString(),
    };

    if (apiError.statusCode === 401 && typeof window !== "undefined") {
      // Session expired or token revoked — sign out and redirect to login.
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/login" });
    }

    return Promise.reject(apiError);
  }
);
