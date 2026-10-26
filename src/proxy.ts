import { NextResponse, type NextRequest } from "next/server";

// Nota: en Next.js 16 la convencion "middleware" se renombro a "proxy".
//
// Se usa para una sola cosa: decidir quien puede insertar el catalogo de un
// anfitrion en un iframe. Tiene que ser aqui porque la unica proteccion real
// es la cabecera `Content-Security-Policy: frame-ancestors`, que el navegador
// aplica ANTES de pintar nada. Una comprobacion en JS (mirar document.referrer
// o window.top) se salta trivialmente y no protege de clickjacking.

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Empresas sin dominios configurados: cualquiera puede insertarlas. */
async function frameAncestorsDe(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_URL}/public/embed-policy/${encodeURIComponent(slug)}`,
      // El catalogo es publico y la politica cambia poco: cachear evita una
      // llamada al API en cada carga de pagina.
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;

    const { data } = (await res.json()) as { data?: { domains?: string[] } };
    const dominios = data?.domains ?? [];
    if (dominios.length === 0) return null;

    // 'self' siempre: la propia app previsualiza el catalogo.
    return ["'self'", ...dominios].join(" ");
  } catch {
    // Si el API no responde no bloqueamos la pagina: preferimos servirla
    // sin restriccion antes que romper el catalogo de todos los anfitriones.
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const slug = req.nextUrl.pathname.split("/")[2];
  if (!slug) return NextResponse.next();

  const ancestors = await frameAncestorsDe(slug);
  const res = NextResponse.next();
  if (ancestors) {
    res.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  }
  return res;
}

export default proxy;

export const config = {
  matcher: ["/book/:slug*"],
};
