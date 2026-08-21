// Distribucion de experiencias en canales externos.
//
// La empresa la resuelve el API desde la sesion, asi que aqui no viaja
// ningun companyId.
import { api } from './client';

export type ChannelType = 'OPENTABLE';

/**
 * ASISTIDO = el canal no acepta fichas por API, así que FILO prepara el
 * contenido y el anfitrión lo carga en el back-office del canal.
 */
export type ModoCanal = 'API' | 'ASISTIDO';

export type EstadoListing = 'DRAFT' | 'READY' | 'PUBLISHED' | 'UNPUBLISHED';

export type Canal = {
  channel: ChannelType;
  nombre: string;
  modo: ModoCanal;
  urlBackoffice: string;
  instrucciones: string[];
};

export type CampoFicha = {
  etiqueta: string;
  valor: string;
  multilinea?: boolean;
};

export type Faltante = { campo: string; mensaje: string };

export type Ficha = {
  experiencia: { id: string; title: string; status: string };
  canal: Canal;
  campos: CampoFicha[];
  faltantes: Faltante[];
  listo: boolean;
  listing: {
    id: string;
    status: EstadoListing;
    externalUrl: string | null;
    publishedAt: string | null;
  } | null;
};

export type ExperienciaEnCanales = {
  id: string;
  title: string;
  status: string;
  featuredImage: string | null;
  canales: Array<{
    channel: ChannelType;
    nombre: string;
    modo: ModoCanal;
    listo: boolean;
    faltantes: number;
    status: EstadoListing | null;
    externalUrl: string | null;
    publishedAt: string | null;
  }>;
};

export const listarCanales = () => api.get<Canal[]>('/channels');

export const listarDistribucion = () =>
  api.get<ExperienciaEnCanales[]>('/channels/listings');

export const obtenerFicha = (channel: ChannelType, experienceId: string) =>
  api.get<Ficha>(`/channels/${channel}/experiences/${encodeURIComponent(experienceId)}`);

export const marcarPublicada = (
  channel: ChannelType,
  experienceId: string,
  datos: { externalUrl?: string; externalId?: string; notes?: string },
) =>
  api.post(
    `/channels/${channel}/experiences/${encodeURIComponent(experienceId)}/published`,
    datos,
  );

export const despublicar = (channel: ChannelType, experienceId: string) =>
  api.delete(`/channels/${channel}/experiences/${encodeURIComponent(experienceId)}/published`);
