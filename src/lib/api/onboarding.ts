// Primeros pasos del anfitrión: lo que lleva hecho y cómo va su recorrido.
import { api } from './client';

/** Lo que el usuario decide; lo demás se calcula en el API. */
export interface EstadoDeOnboarding {
  /** Ya vio el tour por la plataforma. */
  tourVisto: boolean;
  /** Pasos que decidió saltar. */
  descartados: string[];
  /** Cerró la lista de primeros pasos. */
  oculto: boolean;
}

/** Lo que ya existe en su empresa. */
export interface AvanceDeOnboarding {
  sedes: number;
  experiencias: number;
  horarios: number;
  publicaciones: number;
  /** Tiene una pasarela con la que cobrar. */
  cobros: boolean;
}

export interface OnboardingDelUsuario {
  estado: EstadoDeOnboarding;
  avance: AvanceDeOnboarding;
}

export const getOnboarding = () => api.get<OnboardingDelUsuario>('/onboarding');

export const guardarOnboarding = (
  cambio: Partial<EstadoDeOnboarding> & { reiniciar?: boolean },
) => api.put<OnboardingDelUsuario>('/onboarding', cambio);
