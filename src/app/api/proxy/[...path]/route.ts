// Proxy server-side al API. El cliente llama a /api/proxy/<ruta>; nosotros
// adjuntamos el JWT de NextAuth como Bearer y reenviamos al API.
//
// Por que un proxy y no llamar al API directo desde el cliente:
//   - El JWT se queda en cookie httpOnly y nunca se expone a JS
//   - No necesitamos preflight CORS (mismo origen)
//   - Punto unico para logging, retries, transformaciones a futuro
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Nombres de cookie de Auth.js v5. El prefijo __Secure- se usa cuando el sitio
// corre en HTTPS (set-cookie con Secure flag). Detras de Cloudflare/nginx el
// proceso Next ve el request como HTTP, asi que getToken() del helper de
// next-auth se confunde con el prefijo. Leemos la cookie directamente.
const AUTH_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "content-encoding",
  "content-length",
  "host",
]);

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const target = `${API_URL}/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });

  const cookieStore = await cookies();
  let token: string | undefined;
  for (const name of AUTH_COOKIE_NAMES) {
    const c = cookieStore.get(name);
    if (c?.value) {
      token = c.value;
      break;
    }
  }
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
