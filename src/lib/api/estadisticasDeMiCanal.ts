// Resumen, embudo y series de lo que ha generado el canal de un revendedor.
//
// Dos fuentes: las reservas (lo vendido) y los eventos del catalogo (lo que la
// gente hizo antes de reservar o en vez de reservar). El API las junta.
import { api } from './client';

export interface EstadisticasDeMiCanal {
  periodo: { desde: string; hasta: string };
  resumen: {
    visitas: number;
    reservas: number;
    canceladas: number;
    personas: number;
    comisionGenerada: number;
    ventasTotales: number;
    /** Reservas / visitas, en %. null si no hubo visitas medidas. */
    conversion: number | null;
  };
  embudo: Array<{ paso: string; sesiones: number }>;
  serie: Array<{ fecha: string; visitas: number; reservas: number; comision: number }>;
  porEstado: Array<{ estado: string; cantidad: number }>;
  topExperiencias: Array<{
    experienceId: string;
    titulo: string;
    vistas: number;
    reservas: number;
    comision: number;
  }>;
}

export const getEstadisticasDeMiCanal = (params?: { dateFrom?: string; dateTo?: string }) =>
  api.get<EstadisticasDeMiCanal>('/reservations/de-mi-canal/estadisticas', {
    ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
  });

// ─── Lo que se mide en el catálogo público ────────────────────────────────

export type TipoDeEvento = 'VISITA' | 'VER_EXPERIENCIA' | 'ELEGIR_FECHA' | 'INICIAR_RESERVA';

/** Id anónimo por pestaña: cuenta personas distintas sin saber quiénes son. */
function idDeSesion(): string {
  try {
    const clave = 'filo:sesion-catalogo';
    let id = sessionStorage.getItem(clave);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(clave, id);
    }
    return id;
  } catch {
    // Sin almacenamiento cada evento sería "otra persona"; mejor no medir.
    return '';
  }
}

/**
 * Avisa al API de una interacción en el catálogo de un revendedor.
 * Nunca lanza ni espera: medir no puede romper ni retrasar una reserva.
 */
export function registrarEvento(slug: string, tipo: TipoDeEvento, experienceId?: string): void {
  if (typeof window === 'undefined') return;
  const sessionId = idDeSesion();
  if (!sessionId) return;
  void api
    .post(`/public/reseller/${encodeURIComponent(slug)}/evento`, {
      tipo,
      sessionId,
      ...(experienceId ? { experienceId } : {}),
    })
    .catch(() => undefined);
}
