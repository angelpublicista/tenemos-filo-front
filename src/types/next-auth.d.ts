import type { DefaultSession } from "next-auth";

type AppRole = "HOST" | "GUEST" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      companyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
    companyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    companyId?: string | null;
  }
}
