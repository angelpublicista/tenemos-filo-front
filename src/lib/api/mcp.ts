// El servidor MCP de FILO, visto desde el panel.
//
// Un anfitrión conecta su asistente (Claude, ChatGPT, Cursor) a su cuenta y a
// partir de ahí el asistente puede consultar y operar en su nombre. Aquí está
// lo que el panel necesita: enseñar qué pide una aplicación antes de
// aprobarla, y listar y cortar las que ya están conectadas.
import { api } from './client';

/** A dónde tiene que apuntar el asistente. */
export const URL_DEL_MCP = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/mcp`;

/**
 * Las áreas sobre las que se concede permiso, como las ve el anfitrión.
 *
 * El API maneja permisos sueltos (`reservations:read`, `reservations:write`);
 * aquí se agrupan por área con dos casillas, consultar y modificar, que es
 * como se piensa: «que vea mis reservas pero no las toque».
 */
export const AREAS: Array<{ clave: string; titulo: string; descripcion: string; soloConsulta?: boolean }> = [
  { clave: 'experiences', titulo: 'Experiencias', descripcion: 'Tu catálogo, precios y en qué sedes está publicado' },
  { clave: 'availabilities', titulo: 'Disponibilidad', descripcion: 'Horarios, fechas sueltas y fechas bloqueadas' },
  { clave: 'locations', titulo: 'Sedes', descripcion: 'Dónde ocurren tus experiencias' },
  { clave: 'menus', titulo: 'Menús', descripcion: 'Tus menús y sus platos' },
  { clave: 'reservations', titulo: 'Reservas', descripcion: 'Crear, mover, cancelar y registrar pagos y reembolsos' },
  { clave: 'contacts', titulo: 'Contactos', descripcion: 'Las personas de tu CRM' },
  { clave: 'crm-companies', titulo: 'Empresas cliente', descripcion: 'Las empresas de tu CRM' },
  { clave: 'opportunities', titulo: 'Oportunidades', descripcion: 'Tu embudo de ventas, de la solicitud al cierre' },
  { clave: 'quotes', titulo: 'Cotizaciones', descripcion: 'Las propuestas que envías' },
  { clave: 'dashboard', titulo: 'Estadísticas', descripcion: 'Ingresos, ocupación y actividad reciente', soloConsulta: true },
  { clave: 'companies', titulo: 'Tu empresa', descripcion: 'Los datos de tu empresa', soloConsulta: true },
];

export interface SolicitudDeConexion {
  /** El nombre que la aplicación dice tener. */
  aplicacion: string;
  /** A dónde vuelve con el permiso: esto no se lo puede inventar. */
  vuelveA: string;
  permisos: string[];
  empresa: { id: string; companyName: string } | null;
}

export interface ParametrosDeAutorizacion {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
  scope?: string;
}

export const getSolicitud = (p: ParametrosDeAutorizacion) =>
  api.get<SolicitudDeConexion>('/oauth/solicitud', {
    client_id: p.client_id,
    redirect_uri: p.redirect_uri,
    scope: p.scope,
  });

/** Aprueba o niega. Devuelve a dónde hay que llevar el navegador. */
export const decidirConexion = (p: ParametrosDeAutorizacion, aprobado: boolean, permisos: string[]) =>
  api.post<{ redirigirA: string }>('/oauth/decision', {
    client_id: p.client_id,
    redirect_uri: p.redirect_uri,
    code_challenge: p.code_challenge,
    state: p.state,
    aprobado,
    permisos,
  });

export interface ConexionDeAsistente {
  id: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  client: { name: string };
  user: { name: string | null; email: string };
}

export const getConexiones = () => api.get<ConexionDeAsistente[]>('/oauth/conexiones');
export const cortarConexion = (id: string) =>
  api.delete(`/oauth/conexiones/${encodeURIComponent(id)}`);

/**
 * Dónde se guarda a qué pantalla volver después de iniciar sesión.
 *
 * Quien llega desde su asistente sin sesión tiene que pasar por el login y
 * regresar a aprobar: si acabara en el panel, la conexión se quedaría a medias
 * sin que nadie le dijera por qué.
 */
export const CLAVE_DE_VUELTA = 'filo:volver-a';
