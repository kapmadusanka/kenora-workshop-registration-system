import type { DefaultSession } from "next-auth";
import type { Role } from "@/types";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
    accessToken?: string;
    accessTokenExpires?: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    accessToken?: string;
    accessTokenExpires?: number;
  }
}
