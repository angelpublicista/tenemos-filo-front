// Envio de la cotizacion del CRM al cliente.
//
// Se compone aqui y no en el API porque la cotizacion no se guarda: es un
// correo que el anfitrion arma en pantalla y manda. Si algun dia se persisten
// las cotizaciones, este envio deberia mudarse al API con el resto del correo.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enviarCorreo, esc } from '@/lib/email/zeptomail';

interface ExperienceForEmail {
  title: string;
  description: string;
  duration: number;
  minCapacity?: number;
  capacity: number;
  basePrice: number;
  currency: string;
  includes?: string[];
}

/** Quien puede mandar cotizaciones. Un comensal no cotiza. */
const ROLES_QUE_COTIZAN = new Set(['HOST', 'ADMIN', 'RESELLER']);

const dinero = (n: number) => Number(n || 0).toLocaleString('es-CO');

/**
 * La fecha del evento es un dia del calendario, no un instante.
 *
 * Viene de un <input type="date"> como "2026-09-20". new Date() lo interpreta
 * como medianoche UTC, asi que formatearlo en cualquier zona al oeste lo
 * retrasa un dia: la cotizacion diria 19 donde el anfitrion escribio 20. Se
 * formatea en UTC justamente para que el dia salga tal cual se escribio.
 */
function formatearDia(
  valor: string,
  opciones: Intl.DateTimeFormatOptions = {},
): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '').trim());
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor ?? '');
  return fecha.toLocaleDateString('es-CO', {
    timeZone: soloFecha ? 'UTC' : 'America/Bogota',
    ...opciones,
  });
}

export async function POST(request: NextRequest) {
  // Sin esto la ruta era un relay abierto: cualquiera podia mandar correo con
  // HTML arbitrario desde el dominio del proyecto. Ademas de servir para spam,
  // eso termina con el dominio en listas negras y la cuenta de envio suspendida.
  const session = await auth();
  const rol = String(session?.user?.role ?? '').toUpperCase();
  if (!session?.user || !ROLES_QUE_COTIZAN.has(rol)) {
    return NextResponse.json(
      { success: false, message: 'No autorizado' },
      { status: 401 },
    );
  }

  try {
    const data = await request.json();
    const {
      customerName,
      customerEmail,
      hostName,
      companyName,
      experiences,
      eventDate,
      eventTime,
      guests,
      location,
      notes,
    } = data;

    if (!customerEmail || !Array.isArray(experiences) || experiences.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Faltan el correo del cliente o las experiencias' },
        { status: 400 },
      );
    }

    const fechaLarga = formatearDia(eventDate, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const fechaCorta = formatearDia(eventDate);

    const experiencesHTML = (experiences as ExperienceForEmail[])
      .map(
        (exp, index) => `
      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <div style="background: linear-gradient(135deg, #F26726 0%, #E23694 100%); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">Opción ${index + 1}</h3>
        </div>

        <h4 style="color: #334C5D; margin: 0 0 10px 0; font-size: 18px;">${esc(exp.title)}</h4>
        <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">${esc(exp.description)}</p>

        <table role="presentation" width="100%" style="font-size: 14px; margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
          <tr>
            <td style="padding: 15px; vertical-align: top;">
              <p style="margin: 5px 0; color: #6b7280;">
                <strong style="color: #334C5D;">⏱️ Duración:</strong> ${esc(exp.duration)} minutos
              </p>
              <p style="margin: 5px 0; color: #6b7280;">
                <strong style="color: #334C5D;">👥 Capacidad:</strong> ${esc(exp.minCapacity || 1)} - ${esc(exp.capacity)} personas
              </p>
            </td>
            <td style="padding: 15px; text-align: right; vertical-align: top;">
              <p style="margin: 5px 0; color: #6b7280; font-size: 13px;">
                $${dinero(exp.basePrice)} ${esc(exp.currency)} × ${esc(guests)} personas
              </p>
              <p style="margin: 5px 0; color: #F26726; font-size: 20px; font-weight: bold;">
                $${dinero(exp.basePrice * guests)} ${esc(exp.currency)}
              </p>
            </td>
          </tr>
        </table>

        ${
          exp.includes && exp.includes.length > 0
            ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #065f46; font-weight: 600; font-size: 14px;">✓ Esta opción incluye:</p>
            <ul style="margin: 0; padding-left: 20px; color: #047857;">
              ${exp.includes.map((item: string) => `<li style="margin: 5px 0;">${esc(item)}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `,
      )
      .join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización - ${esc(companyName)}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F26726 0%, #E23694 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Cotización de Experiencias</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">
              ${esc(companyName)}
            </p>
          </div>

          <!-- Contenido -->
          <div style="padding: 40px 30px;">
            <p style="color: #334C5D; font-size: 16px; margin: 0 0 20px 0;">
              Hola <strong>${esc(customerName)}</strong>,
            </p>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
              ${esc(hostName)} ha preparado esta cotización especial para tu evento. A continuación encontrarás los detalles de las experiencias seleccionadas.
            </p>

            <!-- Datos del Evento -->
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
              <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📅 Detalles del Evento</h2>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Fecha:</strong> ${esc(fechaLarga)}</p>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Hora:</strong> ${esc(eventTime)}</p>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Número de personas:</strong> ${esc(guests)}</p>
              ${location ? `<p style="margin: 5px 0; color: #1e3a8a;"><strong>Ubicación:</strong> ${esc(location)}</p>` : ''}
            </div>

            <!-- Opciones de Experiencias -->
            <h2 style="color: #334C5D; margin: 0 0 10px 0; font-size: 22px;">🎯 Opciones para tu Evento</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 25px 0; line-height: 1.6;">
              A continuación encontrarás ${experiences.length} ${experiences.length === 1 ? 'opción' : 'opciones diferentes'} que hemos preparado especialmente para tu evento. Cada opción incluye el precio total para ${esc(guests)} personas.
            </p>

            ${experiencesHTML}

            ${
              notes
                ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📝 Notas Adicionales</h3>
                <p style="color: #78350f; margin: 0; white-space: pre-wrap; line-height: 1.6;">${esc(notes)}</p>
              </div>
            `
                : ''
            }

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 40px; background-color: #f9fafb; padding: 30px; border-radius: 12px;">
              <p style="color: #334C5D; font-size: 16px; margin-bottom: 15px; font-weight: 600;">
                ¿Cuál opción te gusta más? 💬
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.6;">
                Responde este correo indicando la opción de tu preferencia o si deseas combinar
                elementos de diferentes opciones. ¡Estamos para ayudarte a crear el evento perfecto!
              </p>
            </div>

            <!-- Nota al pie -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 5px 0;">
                Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.
              </p>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                Cada opción muestra el precio total para ${esc(guests)} ${guests === 1 ? 'persona' : 'personas'}.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              ${esc(companyName)}
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Tenemos Filo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resultado = await enviarCorreo({
      to: customerEmail,
      subject: `Cotización para tu evento - ${fechaCorta}`,
      html: emailHTML,
      // El cliente ve el nombre de la empresa como remitente, aunque la
      // direccion sea la del dominio verificado.
      fromName: companyName || undefined,
      // El correo invita a responder, asi que la respuesta tiene que llegarle
      // al anfitrion y no al buzon de envio, que nadie lee.
      ...(session.user.email
        ? { replyTo: { address: session.user.email, name: hostName || undefined } }
        : {}),
    });

    if (!resultado.ok) {
      const mensaje =
        resultado.motivo === 'sin-configurar'
          ? 'El envío de correo no está configurado. Falta ZEPTOMAIL_TOKEN.'
          : 'No se pudo enviar la cotización. Inténtalo de nuevo.';
      return NextResponse.json({ success: false, message: mensaje }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Cotización enviada' });
  } catch (error) {
    console.error('Error enviando la cotización:', error);
    return NextResponse.json(
      { success: false, message: 'Error al enviar la cotización' },
      { status: 500 },
    );
  }
}
