// Handler oficial de NextAuth v5.
// Las rutas hermanas /api/auth/google, /api/auth/microsoft, /api/auth/zoho
// son route handlers especificos de la integracion de calendarios; Next.js
// les da precedencia sobre este catch-all, asi que no hay colision.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
