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

/**
 * Cada cuanto se vuelven a preguntar `role` y `companyId` al API.
 *
 * El problema que resuelve: estos dos viajaban dentro del JWT y solo se
 * escribian al iniciar sesion. Quien entraba antes de tener empresa —el caso
 * normal: primero te registras, despues creas la empresa— se quedaba con un
 * token que decia `companyId: null` para siempre. El front lo disimulaba,
 * porque el suyo lo lee de /users/me y era correcto, pero el API autoriza con
 * el del token: el panel se veia bien y cada llamada con alcance de empresa
 * respondia 403.
 *
 * Cinco minutos es el compromiso: quien acaba de crear su empresa espera como
 * mucho eso, y es una llamada por persona cada cinco minutos, no una por
 * peticion. Para que sea inmediato existe `trigger: "update"`, que lo fuerza
 * desde la aplicacion con useSession().update().
 */
const REFRESCO_MS = 5 * 60 * 1000;

/**
 * Relee del API el rol y la empresa del usuario del token.
 *
 * Firma un bearer corto con el mismo secreto que el API verifica — no hay otra
 * forma de llamarle desde aqui, donde no existe la cookie de sesion todavia.
 * Solo necesita el `sub`, asi que un token con companyId rancio sirve
 * igualmente para preguntar cual es el bueno.
 *
 * Devuelve null si algo falla, y el caller deja el token como estaba: que el
 * API no conteste no es motivo para degradar una sesion valida.
 */
async function releerUsuario(token: JWT): Promise<Pick<ApiUser, "role" | "companyId"> | null> {
  const sub = typeof token.sub === "string" ? token.sub : token.id;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!sub || !secret) return null;

  try {
    const bearer = await new SignJWT({ email: token.email, role: token.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setSubject(sub)
      .setExpirationTime("1m")
      .sign(secretBytes(secret));

    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: ApiUser };
    return { role: json.data.role, companyId: json.data.companyId };
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
    async jwt({ token, user, trigger }) {
      // Al iniciar sesion viene `user` con los datos recien traidos del API.
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "GUEST";
        token.companyId = user.companyId ?? null;
        token.refrescadoEn = Date.now();
        return token;
      }

      // Despues, cada tanto: ver REFRESCO_MS.
      const vencido = Date.now() - (token.refrescadoEn ?? 0) > REFRESCO_MS;
      if (trigger === "update" || vencido) {
        const frescos = await releerUsuario(token);
        if (frescos) {
          token.role = frescos.role;
          token.companyId = frescos.companyId;
        }
        // La marca se pone aunque falle, o un API caido convertiria cada
        // peticion en un reintento.
        token.refrescadoEn = Date.now();
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
