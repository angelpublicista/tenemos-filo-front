// La base de conocimiento: artículos de ayuda que escribe el administrador.
import { api } from './client';

export type RolDeAudiencia = 'HOST' | 'RESELLER' | 'GUEST' | 'ADMIN';

export interface ArticuloResumen {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  position: number;
  /** Vacío = se le muestra a todos. */
  audience: RolDeAudiencia[];
  isPublished: boolean;
  updatedAt: string;
}

export interface Articulo extends ArticuloResumen {
  /** Markdown. */
  body: string;
}

export type DatosDeArticulo = Omit<Articulo, 'id' | 'updatedAt'>;

export const listArticulos = async (filtros: { q?: string; category?: string } = {}) =>
  (await api.get<ArticuloResumen[]>('/ayuda/articulos', filtros)) ?? [];

export const getArticulo = (slug: string) =>
  api.get<Articulo>(`/ayuda/articulos/${encodeURIComponent(slug)}`);

export const crearArticulo = (datos: DatosDeArticulo) =>
  api.post<Articulo>('/ayuda/articulos', datos);

export const actualizarArticulo = (id: string, datos: Partial<DatosDeArticulo>) =>
  api.patch<Articulo>(`/ayuda/articulos/${id}`, datos);

export const eliminarArticulo = (id: string) => api.delete<void>(`/ayuda/articulos/${id}`);
