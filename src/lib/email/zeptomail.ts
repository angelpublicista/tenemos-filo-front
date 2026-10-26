// Envio de correo transaccional via la API REST de ZeptoMail (Zoho).
//
// El grueso del correo del producto lo manda el API (tenemosfilo-api): avisos
// de reserva, recuperacion de contraseña. Aqui solo queda lo que se compone en
// el front y no tiene endpoint propio en el API — hoy, las cotizaciones del
// CRM.
//
// Usa las MISMAS variables de entorno que el API a proposito: si las dos
// aplicaciones se despliegan juntas, se configura el correo una sola vez.
//
// Solo servidor: ZEPTOMAIL_TOKEN no lleva el prefijo NEXT_PUBLIC_, asi que en
// el navegador quedaria indefinido. Importar esto desde un componente de
// cliente no filtra el token, pero tampoco enviaria nada.

const API_POR_DEFECTO = 'https://api.zeptomail.com/v1.1/email';

/**
 * El token tal como lo espera la cabecera.
 *
 * La consola de ZeptoMail muestra el "Send Mail Token" a veces suelto y a
 * veces ya con el prefijo pegado. Si alguien copia la linea completa y aqui
 * volvemos a anteponerlo, sale un 401 que no dice nada util.
 */
const PREFIJO = 'Zoho-enczapikey';

function cabeceraDeAutorizacion(token: string): string {
  const limpio = token.trim();
  return limpio.toLowerCase().startsWith(PREFIJO.toLowerCase())
    ? limpio
    : `${PREFIJO} ${limpio}`;
}

type EnvioDeCorreo = {
  to: string;
  subject: string;
  html: string;
  /** Nombre que ve el destinatario como remitente. La direccion no cambia. */
  fromName?: string;
  /** A donde contesta si le da a "Responder". */
  replyTo?: { address: string; name?: string };
};

export type ResultadoDeEnvio =
  | { ok: true }
  | { ok: false; motivo: 'sin-configurar' | 'rechazado' | 'red'; detalle?: string };

/**
 * Manda un correo. No lanza: devuelve por que fallo.
 *
 * Quien llama decide si eso cambia su respuesta HTTP. Un fallo de correo no
 * siempre es un fallo de la operacion.
 */
export async function enviarCorreo({
  to,
  subject,
  html,
  fromName,
  replyTo,
}: EnvioDeCorreo): Promise<ResultadoDeEnvio> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const remitente = process.env.ZEPTOMAIL_FROM_EMAIL;

  if (!token || !remitente) {
    console.error('ZEPTOMAIL_TOKEN o ZEPTOMAIL_FROM_EMAIL sin configurar: no se envio el correo');
    return { ok: false, motivo: 'sin-configurar' };
  }

  try {
    const res = await fetch(process.env.ZEPTOMAIL_API_URL || API_POR_DEFECTO, {
      method: 'POST',
      headers: {
        Authorization: cabeceraDeAutorizacion(token),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: {
          address: remitente,
          name: fromName || process.env.ZEPTOMAIL_FROM_NAME || 'Tenemos Filo',
        },
        // ZeptoMail anida el destinatario un nivel mas que otros proveedores:
        // to[].email_address.address, no to[].email.
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: html,
        ...(replyTo ? { reply_to: [{ address: replyTo.address, name: replyTo.name }] } : {}),
      }),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      console.error('ZeptoMail rechazo el envio de correo', res.status, detalle);
      return { ok: false, motivo: 'rechazado', detalle };
    }
    return { ok: true };
  } catch (err) {
    console.error('Error de red enviando correo por ZeptoMail', err);
    return { ok: false, motivo: 'red', detalle: err instanceof Error ? err.message : undefined };
  }
}

/**
 * Escapa lo que viene del usuario antes de meterlo en el HTML del correo.
 *
 * Los datos de una cotizacion los teclea el anfitrion, pero acaban en el
 * correo de un tercero: sin esto, un titulo o una nota con etiquetas se
 * ejecutaria en el cliente de correo de quien la recibe.
 */
export function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
