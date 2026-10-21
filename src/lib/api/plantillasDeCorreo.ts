// Plantillas de correo que el administrador puede ver y editar.
import { api } from './client';

export interface PlantillaResumen {
  key: string;
  nombre: string;
  descripcion: string;
  cuando: string;
  /** Tiene una versión propia; si no, se usa el texto por defecto. */
  personalizada: boolean;
  updatedAt: string | null;
}

export interface VariableDePlantilla {
  clave: string;
  descripcion: string;
  ejemplo: string;
}

export interface ContenidoDePlantilla {
  subject: string;
  title: string;
  /** HTML sencillo con variables {{asi}}. */
  body: string;
  buttonText: string;
}

export interface PlantillaDetalle extends PlantillaResumen {
  variables: VariableDePlantilla[];
  defecto: ContenidoDePlantilla;
  actual: ContenidoDePlantilla;
}

export const listPlantillas = async () => (await api.get<PlantillaResumen[]>('/plantillas-de-correo')) ?? [];

export const getPlantilla = (key: string) =>
  api.get<PlantillaDetalle>(`/plantillas-de-correo/${encodeURIComponent(key)}`);

export const guardarPlantilla = (key: string, contenido: ContenidoDePlantilla) =>
  api.put<PlantillaDetalle>(`/plantillas-de-correo/${encodeURIComponent(key)}`, contenido);

/** Vuelve al texto por defecto. */
export const restaurarPlantilla = (key: string) =>
  api.delete<PlantillaDetalle>(`/plantillas-de-correo/${encodeURIComponent(key)}`);

/** El correo armado con valores de ejemplo, sin guardar. */
export const vistaPreviaDePlantilla = (key: string, contenido: ContenidoDePlantilla) =>
  api.post<{ subject: string; html: string }>(
    `/plantillas-de-correo/${encodeURIComponent(key)}/vista-previa`,
    contenido,
  );

/** Un envío real al correo del administrador. */
export const enviarPruebaDePlantilla = (key: string, contenido: ContenidoDePlantilla) =>
  api.post<{ enviadoA: string }>(`/plantillas-de-correo/${encodeURIComponent(key)}/prueba`, contenido);
