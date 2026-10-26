import type { DefaultSession } from "next-auth";

// Los cuatro del enum UserRole del API. Faltaba RESELLER, que existe desde
// que un canal de venta puede ser titular de su empresa y tiene panel propio.
type AppRole = "HOST" | "GUEST" | "ADMIN" | "RESELLER";

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
    /** Cuando se releyeron `role` y `companyId` del API. Epoch en ms. */
    refrescadoEn?: number;
  }
}
