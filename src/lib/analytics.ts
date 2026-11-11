// Eventos hacia Google Tag Manager (dataLayer).
//
// Un solo sitio por donde sale todo, para que las reglas se cumplan una vez:
//
// - Nada personal. Ni correos, ni nombres, ni teléfonos, ni documentos: lo que
//   entra al dataLayer lo recibe Google y los demás píxeles del contenedor. Se
//   manda el rol, el identificador de la experiencia y los importes; nunca
//   quién es la persona.
// - Los nombres de los eventos de comercio son los recomendados de GA4
//   (view_item, add_to_cart, begin_checkout, purchase), con `items`, para que
//   los informes de comercio funcionen sin traducir nada en GTM.
// - Nunca lanza: medir no puede romper una reserva.
//
// Si no hay contenedor configurado, `dataLayer` existe pero nadie lo lee.

type Valor = string | number | boolean | null | undefined | Valor[] | { [k: string]: Valor };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** El motor de reservas puede ir incrustado en la web de un anfitrión. */
const esEmbed = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
};

/**
 * Manda un evento. `origen` se añade solo (`embed` o `app`) para poder separar
 * en los informes lo que entra por la web de un anfitrión de lo demás.
 */
export function evento(nombre: string, parametros: Record<string, Valor> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: nombre, origen: esEmbed() ? 'embed' : 'app', ...parametros });
  } catch {
    /* Medir no puede romper nada. */
  }
}

// ─── Comercio ──────────────────────────────────────────────────────────────

export const MONEDA = 'COP';

export interface ArticuloDeComercio {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

interface DatosDeExperiencia {
  id: string;
  titulo: string;
  precio: number;
  personas?: number;
}

const articulo = (e: DatosDeExperiencia): ArticuloDeComercio => ({
  item_id: e.id,
  item_name: e.titulo,
  price: e.precio,
  quantity: e.personas ?? 1,
});

export const verExperiencia = (e: DatosDeExperiencia) =>
  evento('view_item', { currency: MONEDA, value: e.precio, items: [articulo(e)] as unknown as Valor });

export const elegirFecha = (e: DatosDeExperiencia, valor: number) =>
  evento('add_to_cart', { currency: MONEDA, value: valor, items: [articulo(e)] as unknown as Valor });

export const iniciarPago = (e: DatosDeExperiencia, valor: number) =>
  evento('begin_checkout', { currency: MONEDA, value: valor, items: [articulo(e)] as unknown as Valor });

/** La reserva existe, se haya pagado o no. Es la conversión del embudo. */
export const reservaCreada = (e: DatosDeExperiencia, valor: number, numero: string) =>
  evento('reserva_creada', {
    transaction_id: numero,
    currency: MONEDA,
    value: valor,
    items: [articulo(e)] as unknown as Valor,
  });

/** El dinero entró: lo único que cuenta como ingreso. */
export const compra = (numero: string, valor: number | null, items: ArticuloDeComercio[] | null) =>
  evento('purchase', {
    transaction_id: numero,
    currency: MONEDA,
    ...(valor !== null ? { value: valor } : {}),
    ...(items ? { items: items as unknown as Valor } : {}),
  });

// ─── Lo que se recuerda entre la reserva y el retorno del pago ──────────────

const CLAVE_DE_COMPRA = 'filo:compra:';

interface CompraPendiente {
  valor: number;
  items: ArticuloDeComercio[];
}

/**
 * Se guarda al crear la reserva para completar `purchase` cuando el cliente
 * vuelve de la pasarela: esa página solo conoce el número de reserva, no lo
 * que se compró.
 */
export function recordarCompra(numero: string, compra: CompraPendiente): void {
  try {
    sessionStorage.setItem(CLAVE_DE_COMPRA + numero, JSON.stringify(compra));
  } catch {
    /* Sin almacenamiento, la compra se mide sin importe. */
  }
}

/**
 * Manda `purchase` una sola vez por reserva. Recargar la página de retorno no
 * puede contar dos ventas.
 */
export function compraConfirmada(numero: string): void {
  try {
    const marca = `${CLAVE_DE_COMPRA}${numero}:enviada`;
    if (sessionStorage.getItem(marca)) return;
    sessionStorage.setItem(marca, '1');

    const crudo = sessionStorage.getItem(CLAVE_DE_COMPRA + numero);
    const guardada = crudo ? (JSON.parse(crudo) as CompraPendiente) : null;
    compra(numero, guardada?.valor ?? null, guardada?.items ?? null);
  } catch {
    compra(numero, null, null);
  }
}
