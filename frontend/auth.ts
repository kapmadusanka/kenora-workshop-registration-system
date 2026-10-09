import NextAuth, {CredentialsSignin, DefaultSession} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { Role } from "@/types";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}

export class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

export class ServerError extends CredentialsSignin {
  code = "server_error";
}

declare module "next-auth" {
  interface User {
    id: string;
    name?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      roles: string[];
      role?: string;
      territory?: string;
      warehouseId?: string;
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
  }
}

const loginResponseSchema = z.object({
  token: z.string(),
  token_type: z.string(),
  expires_at: z.string(),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["admin", "manager", "staff"]),
    is_active: z.boolean(),
  }),
});

async function loginBackend(credentials: Partial<Record<string, unknown>>) {
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (res.status === 401) {
      throw new InvalidCredentialsError();
    }
    if (res.status === 403) {
      throw new AccountDeactivatedError();
    }
    if (res.status === 429) {
      throw new TooManyAttemptsError();
    }
    if (!res.ok) {
      throw new ServerError();
    }

    const data = await res.json();
    const parsed = loginResponseSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Backend login response schema mismatch:", parsed.error);
      throw new ServerError();
    }

    const { token, expires_at, user } = parsed.data;
    const expiresMs = Date.parse(expires_at);

    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: token,
      accessTokenExpires: isNaN(expiresMs) ? Date.now() + 28800 * 1000 : expiresMs,
    };
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      throw err;
    }
    console.error("Network or server error during backend login:", err);
    throw new ServerError();
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 28800, // 8 hours (28800 seconds)
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return await loginBackend(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
        return token;
      }

      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() > token.accessTokenExpires
      ) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
});
