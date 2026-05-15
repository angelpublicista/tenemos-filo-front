import type { NextAuthConfig } from "next-auth";

/**
 * Config edge-safe de NextAuth: lo unico que importa el middleware.
 * No debe contener providers que usen Node-only APIs (bcrypt, fs, etc).
 * Los providers reales viven en src/auth.ts.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Rutas privadas (cuando se active el middleware)
      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/company-setup");

      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
  providers: [], // se inyectan en src/auth.ts
} satisfies NextAuthConfig;
