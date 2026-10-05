// Calificar una experiencia desde el enlace del correo (TR-24).
//
// Sin sesión: quien cena no tiene por qué registrarse para decir si le gustó.
// El token va en la URL y se gasta al usarlo.
import { api } from './client';

export interface QueSeCalifica {
  experiencia: string | null;
  fecha: string;
  empresa: string | null;
  logo: string | null;
  colorMarca: string | null;
  yaCalificada: boolean;
}

export interface Estrellas {
  general: number;
  servicio: number;
  ubicacion: number;
  comida: number;
}

export const getQueSeCalifica = (token: string) =>
  api.get<QueSeCalifica>(`/public/calificar/${encodeURIComponent(token)}`);

export const enviarCalificacion = (token: string, estrellas: Estrellas) =>
  api.post<{ gracias: boolean }>(`/public/calificar/${encodeURIComponent(token)}`, estrellas);
