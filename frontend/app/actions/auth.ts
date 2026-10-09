"use server";

import { signOut } from "@/auth";
import { getServerAccessToken } from "@/lib/server-auth";

export async function logoutAction() {
  const token = await getServerAccessToken();
  const apiUrl = process.env.API_URL || "http://localhost:8000";

  if (token) {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch {
      // Ignore failure per requirement
    }
  }

  await signOut({ redirectTo: "/login" });
}
