import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: "HOST" | "GUEST" | "ADMIN";
  image: string | null;
  phone: string | null;
  companyId: string | null;
};

async function callApi<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await callApi<ApiUser>("/auth/login", {
          email: creds.email,
          password: creds.password,
        });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Para Google: enviamos el id_token al API para upsert del usuario y
      // recuperar role/companyId reales desde nuestra BD.
      if (account?.provider === "google" && account.id_token) {
        const apiUser = await callApi<ApiUser>("/auth/oauth/google", {
          idToken: account.id_token,
        });
        if (!apiUser) return false;
        // Mutamos el user para que el callback jwt reciba los datos del API
        user.id = apiUser.id;
        user.role = apiUser.role;
        user.companyId = apiUser.companyId;
        if (apiUser.name) user.name = apiUser.name;
        if (apiUser.image) user.image = apiUser.image;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "GUEST";
        token.companyId = user.companyId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "GUEST";
      session.user.companyId = token.companyId ?? null;
      return session;
    },
  },
});
