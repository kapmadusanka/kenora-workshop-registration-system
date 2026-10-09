import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

export async function getServerAccessToken(req?: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  if (req) {
    const token = await getToken({ req, secret });
    if (token?.accessToken && typeof token.accessToken === "string") {
      return token.accessToken;
    }
  }

  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    const dummyReq = {
      headers: headersList,
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as unknown as NextRequest;

    const token = await getToken({ req: dummyReq, secret });
    if (token?.accessToken && typeof token.accessToken === "string") {
      return token.accessToken;
    }
  } catch {
    // If not in a request context where cookies/headers are available
  }

  return null;
}
