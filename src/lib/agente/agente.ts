import { api } from '@/lib/api/client';

/**
 * El agente de IA del anfitrión, conectado a su WhatsApp.
 *
 * Los tokens no vuelven del API: solo se dice si están puestos, igual que las
 * llaves de las pasarelas. Para cambiar uno hay que escribirlo entero.
 */
export interface AgenteConfig {
  enabled: boolean;
  nombre: string;
  tono: string | null;
  instrucciones: string | null;
  puedeCrearSolicitud: boolean;
  puedeEnviarEnlace: boolean;
  waPhoneNumberId: string | null;
  waNumero: string | null;
  accessTokenConfigurado: boolean;
  verifyTokenConfigurado: boolean;
  appSecretConfigurado: boolean;
  mensajesPorMes: number;
  mensajesUsados: number;
  /** Qué le falta para atender WhatsApp, en frases listas para enseñar. */
  faltan: string[];
  /** Encendido y con credenciales. Encendido a secas no basta. */
  atendiendoWhatsApp: boolean;
  /** La URL que hay que pegar en Meta, ya armada. */
  urlDelWebhook: string;
}

export interface GuardarAgente {
  enabled?: boolean;
  nombre?: string;
  tono?: string;
  instrucciones?: string;
  puedeCrearSolicitud?: boolean;
  puedeEnviarEnlace?: boolean;
  /** Cadena vacía borra el secreto; omitirlo lo deja como está. */
  waPhoneNumberId?: string;
  waNumero?: string;
  waAccessToken?: string;
  waVerifyToken?: string;
  waAppSecret?: string;
}

export interface ConversacionResumen {
  id: string;
  canal: string;
  telefono: string;
  nombrePerfil: string | null;
  pausada: boolean;
  ultimoMensajeAt: string;
  opportunity: { id: string; name: string; stage: string } | null;
  _count: { mensajes: number };
}

export interface MensajeDeAgente {
  id: string;
  rol: 'CLIENTE' | 'AGENTE' | 'SISTEMA';
  texto: string;
  herramienta: string | null;
  createdAt: string;
}

export interface Conversacion {
  id: string;
  canal: string;
  telefono: string;
  nombrePerfil: string | null;
  pausada: boolean;
  opportunity: { id: string; name: string } | null;
  mensajes: MensajeDeAgente[];
}

export const getAgente = () => api.get<AgenteConfig>('/agente');
export const guardarAgente = (datos: GuardarAgente) => api.put<AgenteConfig>('/agente', datos);

/** Probarlo sin WhatsApp: escribe y mira qué contesta. */
export const probarAgente = (texto: string) =>
  api.post<{ respuesta: string | null; motivo?: string }>('/agente/probar', { texto });

export const getConversaciones = () => api.get<ConversacionResumen[]>('/agente/conversaciones');
export const getConversacion = (id: string) =>
  api.get<Conversacion>(`/agente/conversaciones/${encodeURIComponent(id)}`);

/** Tomar el hilo, o devolvérselo al agente. No apaga el agente. */
export const pausarConversacion = (id: string, pausada: boolean) =>
  api.patch(`/agente/conversaciones/${encodeURIComponent(id)}/pausa`, { pausada });
