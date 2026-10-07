// El catálogo: las experiencias puestas en uso.
//
// Una experiencia es una PIEZA —qué se hace, cuánto dura, qué incluye— y se
// crea en su propio panel. Publicarla es otra cosa: la misma pieza puede ir al
// local del centro como abierta, con cupos sueltos los sábados, y a la finca
// como privada, por encargo y a otro precio.
//
// Esa pareja experiencia–sede es la PUBLICACIÓN, y es la unidad con la que se
// arma el catálogo público.
import { api } from './client';

export interface Publicacion {
  experienceId: string;
  title: string;
  slug: string;
  status: string;
  /** Si va a casa de quien reserva. Entonces no se publica en sedes. */
  atHome: boolean;
  featuredImage: string | null;
  duration: number | null;
  /** Si la pieza tiene lo mínimo para poder venderse (TR-23). */
  completa: boolean;
  /** Lo que le falta, en palabras que se pueden enseñar tal cual. */
  falta: string[];
  /** null = la pieza todavía no se está usando en ningún escenario. */
  locationId: string | null;
  locationName: string | null;
  sedeActiva: boolean | null;
  /**
   * Lo que esta sede declara COMO SUYO. `null` cuando no declara nada y va
   * igual que la pieza; dentro, cada campo nulo también se hereda.
   *
   * Separado de `condiciones` —que son las que acaban rigiendo— porque
   * mezclarlas enseñaba lo heredado como propio, y al editar lo convertía en
   * propio de verdad al guardar.
   */
  propias: {
    kind: 'ABIERTA' | 'PRIVADA' | null;
    minCapacity: number | null;
    basePrice: number | string | null;
    prepTime: number | null;
    cleanupTime: number | null;
    minimumNotice: number | null;
    isPublished: boolean;
    notes: string | null;
  } | null;
  condiciones: {
    locationId: string | null;
    kind: 'ABIERTA' | 'PRIVADA' | null;
    minCapacity: number | null;
    basePrice: number | string | null;
    prepTime: number | null;
    cleanupTime: number | null;
    minimumNotice: number | null;
    isPublished: boolean;
  };
  /** Las iniciales de los días que abre: L M X J V S D. */
  diasQueAbre: string[];
  /** Cuántas franjas tiene puestas. 0 = publicada pero sin horario. */
  franjas: number;
  horarios: number;
}

export interface CondicionesDePublicacion {
  kind?: 'ABIERTA' | 'PRIVADA' | null;
  minCapacity?: number | null;
  basePrice?: number | null;
  prepTime?: number | null;
  cleanupTime?: number | null;
  minimumNotice?: number | null;
  isPublished?: boolean;
  notes?: string | null;
}

export async function getPublicaciones(): Promise<Publicacion[]> {
  // `api.get` ya se queda con el `data` del sobre; leerlo otra vez devolvía
  // undefined y la pantalla salía vacía con el catálogo lleno.
  return (await api.get<Publicacion[]>('/catalogo/publicaciones')) ?? [];
}

/** Pone la experiencia en esa sede. Si no estaba, publicar la ata. */
export async function publicar(
  experienceId: string,
  locationId: string | null,
  condiciones: CondicionesDePublicacion,
): Promise<Publicacion[]> {
  // Sin sede es la publicación de una experiencia a domicilio: la dirección la
  // pone quien reserva, pero lo que está a la venta sigue siendo una
  // publicación, con sus condiciones y su pausa.
  const ruta = locationId
    ? `/catalogo/publicaciones/${experienceId}/${locationId}`
    : `/catalogo/publicaciones/${experienceId}`;
  return (await api.put<Publicacion[]>(ruta, condiciones)) ?? [];
}

/** Deja de venderla ahí sin perder sus condiciones ni su horario. */
export async function pausar(
  p: Publicacion,
  enPausa: boolean,
): Promise<Publicacion[]> {
  // Se mandan las condiciones que la publicación ya tenía: el PUT reemplaza la
  // ficha entera, y mandar solo la pausa borraría el precio y la modalidad.
  const suyas = p.propias;
  return publicar(p.experienceId, p.locationId, {
    kind: suyas?.kind ?? null,
    minCapacity: suyas?.minCapacity ?? null,
    basePrice: suyas?.basePrice == null ? null : Number(suyas.basePrice),
    prepTime: suyas?.prepTime ?? null,
    cleanupTime: suyas?.cleanupTime ?? null,
    minimumNotice: suyas?.minimumNotice ?? null,
    notes: suyas?.notes ?? null,
    isPublished: !enPausa,
  });
}

/**
 * Quita la experiencia de esa sede.
 *
 * No cancela lo ya vendido allí: cierra la venta futura. Devuelve cuántas
 * reservas quedan en pie para poder avisarlo.
 */
export async function quitarPublicacion(
  experienceId: string,
  locationId: string | null,
): Promise<{ publicaciones: Publicacion[]; reservasPorVenir: number }> {
  const ruta = locationId
    ? `/catalogo/publicaciones/${experienceId}/${locationId}`
    : `/catalogo/publicaciones/${experienceId}`;
  const r = await api.delete<{ publicaciones: Publicacion[]; reservasPorVenir: number }>(ruta);
  return { publicaciones: r?.publicaciones ?? [], reservasPorVenir: r?.reservasPorVenir ?? 0 };
}
