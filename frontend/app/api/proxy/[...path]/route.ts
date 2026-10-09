import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerAccessToken } from "@/lib/server-auth";

async function proxyHandler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthenticated." },
      { status: 401 }
    );
  }

  const token = await getServerAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { message: "Unauthenticated: Missing access token." },
      { status: 401 }
    );
  }

  const { path } = await context.params;
  if (!path || path.length === 0) {
    return NextResponse.json(
      { message: "Invalid API path." },
      { status: 400 }
    );
  }

  // Prevent directory traversal or malicious path segments
  const sanitizedSegments = path.filter(
    (segment) => segment !== ".." && segment !== "."
  );
  const targetPath = sanitizedSegments.join("/");

  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const search = req.nextUrl.search;
  const targetUrl = `${apiUrl}/${targetPath}${search}`;

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const contentType = req.headers.get("content-type");
  if (contentType) {
    forwardHeaders["Content-Type"] = contentType;
  }

  let body: string | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const responseBody = await backendRes.text();
    const responseContentType =
      backendRes.headers.get("content-type") || "application/json";

    return new NextResponse(responseBody, {
      status: backendRes.status,
      headers: {
        "Content-Type": responseContentType,
      },
    });
  } catch (err) {
    console.error("Backend proxy request failed:", err);
    return NextResponse.json(
      { message: "Failed to communicate with backend service." },
      { status: 502 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
