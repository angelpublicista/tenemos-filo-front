import { NextResponse } from "next/server";

// Proxy de NextAuth desactivado por defecto (matcher vacio = no se ejecuta).
//
// Nota: en Next.js 16 la convencion "middleware" se renombro a "proxy".
// El archivo debe llamarse src/proxy.ts y exportar `proxy` (o un default).
//
// Cuando se complete la migracion de Firebase -> NextAuth y queramos que
// las rutas privadas se protejan en el edge (sin esperar al render del
// componente <ProtectedRoute>), reemplaza el cuerpo por:
//
//   import NextAuth from "next-auth";
//   import { authConfig } from "./auth.config";
//   export const { auth: proxy } = NextAuth(authConfig);
//   export default proxy;
//
// y en config.matcher pone las rutas privadas, por ejemplo:
//   matcher: ["/dashboard/:path*", "/company-setup/:path*"]
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
