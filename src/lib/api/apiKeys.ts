// Claves de acceso al API para canales de venta.
//
// Se administran siempre con sesion humana: el API bloquea que una clave
// emita o revoque otras.
import { api } from './client';

export type ApiKey = {
  id: string;
  name: string;
  /** Parte visible, para reconocerla en el listado. */
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Solo lo devuelve el API a un admin: ve claves de varias empresas. */
  company?: { id: string; companyName: string } | null;
};

/** Solo al crearla llega `token`; despues no hay forma de recuperarlo. */
export type ApiKeyRecienCreada = ApiKey & { token: string };

/**
 * Permisos que se ofrecen al crear una clave.
 *
 * El API define 19 scopes, pero la mayoria cuelgan de rutas que ademas
 * exigen rol de anfitrion o administrador, asi que una clave recibe 403
 * aunque los tenga. Aqui solo aparecen los que de verdad funcionan: dar a
 * elegir permisos que no sirven es una trampa para quien integra.
 */
export const PERMISOS: Array<{
  scope: string;
  titulo: string;
  descripcion: string;
  escritura?: boolean;
}> = [
  {
    scope: 'experiences:read',
    titulo: 'Ver experiencias',
    descripcion: 'Consultar el catálogo y el detalle de cada experiencia',
  },
  {
    scope: 'availabilities:read',
    titulo: 'Ver disponibilidad',
    descripcion: 'Horarios, antelación mínima y fechas bloqueadas',
  },
  {
    scope: 'locations:read',
    titulo: 'Ver sedes',
    descripcion: 'Dónde ocurren las experiencias presenciales',
  },
  {
    scope: 'companies:read',
    titulo: 'Ver tu empresa',
    descripcion: 'Comprobar a qué empresa pertenece la clave',
  },
  {
    scope: 'reservations:write',
    titulo: 'Crear reservas',
    descripcion: 'Vender a nombre de tus clientes. La comisión se te atribuye automáticamente',
    escritura: true,
  },
  {
    scope: 'quotes:write',
    titulo: 'Crear cotizaciones',
    descripcion: 'Propuestas para grupos y eventos',
    escritura: true,
  },
];

export const listarApiKeys = () => api.get<ApiKey[]>('/api-keys');

export const crearApiKey = (datos: {
  name: string;
  scopes: string[];
  expiresAt?: string;
  /**
   * A que empresa se atribuyen las ventas hechas con esta clave. Solo lo
   * respeta el API si quien llama es ADMIN; a los demas se les ignora y se
   * usa la suya.
   */
  companyId?: string;
}) => api.post<ApiKeyRecienCreada>('/api-keys', datos);

/** Revoca la clave. No se borra: queda en el listado como revocada. */
export const revocarApiKey = (id: string) =>
  api.delete<ApiKey>(`/api-keys/${encodeURIComponent(id)}`);
