import { NextResponse } from "next/server";

// Middleware de NextAuth desactivado por defecto (matcher vacio = no se ejecuta).
//
// Cuando se complete la migracion de Firebase -> NextAuth y queramos que
// las rutas privadas se protejan en el edge (sin esperar al render del
// componente <ProtectedRoute>), reemplaza el cuerpo por:
//
//   import NextAuth from "next-auth";
//   import { authConfig } from "./auth.config";
//   export const { auth: middleware } = NextAuth(authConfig);
//   export default middleware;
//
// y en config.matcher pone las rutas privadas, por ejemplo:
//   matcher: ["/dashboard/:path*", "/company-setup/:path*"]
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
