// Middleware de NextAuth desactivado por defecto.
//
// Cuando se complete la migracion de Firebase -> NextAuth y queramos que
// las rutas privadas se protejan en el edge (sin esperar al render del
// componente <ProtectedRoute>), descomenta el matcher de abajo.
//
// El comportamiento de "authorized" vive en src/auth.config.ts.
//
// import NextAuth from "next-auth";
// import { authConfig } from "./auth.config";
// export const { auth: middleware } = NextAuth(authConfig);
// export default middleware;

export const config = {
  // Matcher vacio = el middleware no se ejecuta para ninguna ruta.
  // Cuando lo actives, usa por ejemplo:
  //   matcher: ["/dashboard/:path*", "/company-setup/:path*"]
  matcher: [],
};
