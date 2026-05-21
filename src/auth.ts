import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { SignJWT, jwtVerify } from "jose";
import { authConfig } from "./auth.config";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// IMPORTANTE: por defecto NextAuth v5 ENCRIPTA el JWT (JWE).
// Nuestro API verifica con jose.jwtVerify (HS256 firmado, no encriptado),
// asi que sobrescribimos encode/decode para que la cookie sea un JWT
// firmado HS256 con NEXTAUTH_SECRET. El mismo secret se usa en el API.
function secretBytes(secret: string | Uint8Array): Uint8Array {
  return typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
}

const jwtEncode = async ({
  token,
  secret,
  maxAge,
}: {
  token?: JWT;
  secret: string | Uint8Array | Array<string | Uint8Array>;
  maxAge?: number;
}): Promise<string> => {
  if (!token) return "";
  const s = Array.isArray(secret) ? secret[0]! : secret;
  const exp = Math.floor(Date.now() / 1000) + (maxAge ?? 30 * 24 * 60 * 60);
  return await new SignJWT({ ...token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(typeof token.sub === "string" ? token.sub : (token.id as string) ?? "")
    .setExpirationTime(exp)
    .sign(secretBytes(s));
};

const jwtDecode = async ({
  token,
  secret,
}: {
  token?: string;
  secret: string | Uint8Array | Array<string | Uint8Array>;
}): Promise<JWT | null> => {
  if (!token) return null;
  const s = Array.isArray(secret) ? secret[0]! : secret;
  try {
    const { payload } = await jwtVerify(token, secretBytes(s));
    return payload as JWT;
  } catch {
    return null;
  }
};

type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: "HOST" | "GUEST" | "ADMIN" | "RESELLER";
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
  jwt: { encode: jwtEncode, decode: jwtDecode },
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
