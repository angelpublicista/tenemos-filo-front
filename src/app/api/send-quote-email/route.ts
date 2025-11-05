import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

export async function POST(request: NextRequest) {
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
      totals,
    } = data;

    // Configurar transporte de email con Brevo
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });

    // Generar HTML del email
    const experiencesHTML = (experiences as ExperienceForEmail[]).map((exp) => `
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h3 style="color: #334C5D; margin: 0 0 10px 0; font-size: 18px;">${exp.title}</h3>
        <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">${exp.description}</p>
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <div>
            <p style="margin: 5px 0; color: #6b7280;">
              <strong>Duración:</strong> ${exp.duration} minutos
            </p>
            <p style="margin: 5px 0; color: #6b7280;">
              <strong>Capacidad:</strong> ${exp.minCapacity || 1} - ${exp.capacity} personas
            </p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #6b7280;">
              $${exp.basePrice.toLocaleString()} ${exp.currency} × ${guests}
            </p>
            <p style="margin: 5px 0; color: #F26726; font-size: 16px; font-weight: bold;">
              $${(exp.basePrice * guests).toLocaleString()} ${exp.currency}
            </p>
          </div>
        </div>
        ${exp.includes && exp.includes.length > 0 ? `
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0; color: #334C5D; font-weight: 600;">Incluye:</p>
            <ul style="margin: 5px 0; padding-left: 20px; color: #6b7280;">
              ${exp.includes.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización - ${companyName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F26726 0%, #E23694 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Cotización de Experiencias</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">
              ${companyName}
            </p>
          </div>

          <!-- Contenido -->
          <div style="padding: 40px 30px;">
            <p style="color: #334C5D; font-size: 16px; margin: 0 0 20px 0;">
              Hola <strong>${customerName}</strong>,
            </p>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
              ${hostName} ha preparado esta cotización especial para tu evento. A continuación encontrarás los detalles de las experiencias seleccionadas.
            </p>

            <!-- Datos del Evento -->
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
              <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📅 Detalles del Evento</h2>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Fecha:</strong> ${new Date(eventDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Hora:</strong> ${eventTime}</p>
              <p style="margin: 5px 0; color: #1e3a8a;"><strong>Número de personas:</strong> ${guests}</p>
              ${location ? `<p style="margin: 5px 0; color: #1e3a8a;"><strong>Ubicación:</strong> ${location}</p>` : ''}
            </div>

            <!-- Experiencias -->
            <h2 style="color: #334C5D; margin: 0 0 20px 0; font-size: 20px;">Experiencias Propuestas</h2>
            ${experiencesHTML}

            ${notes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📝 Notas Adicionales</h3>
                <p style="color: #78350f; margin: 0; white-space: pre-wrap;">${notes}</p>
              </div>
            ` : ''}

            <!-- Total -->
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280; font-size: 16px;">Subtotal:</span>
                <span style="color: #334C5D; font-size: 16px; font-weight: 600;">$${totals.subtotal.toLocaleString()} COP</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                <span style="color: #334C5D; font-size: 20px; font-weight: bold;">Total:</span>
                <span style="color: #F26726; font-size: 24px; font-weight: bold;">$${totals.total.toLocaleString()} COP</span>
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 40px;">
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                ¿Te interesan estas experiencias? Responde este correo para coordinar los detalles.
              </p>
              <a href="mailto:${process.env.BREVO_FROM_EMAIL}" 
                 style="display: inline-block; background-color: #F26726; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Responder
              </a>
            </div>

            <!-- Nota al pie -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              ${companyName}
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Tenemos Filo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email
    await transporter.sendMail({
      from: `"${companyName}" <${process.env.BREVO_FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Cotización para tu evento - ${new Date(eventDate).toLocaleDateString('es-ES')}`,
      html: emailHTML,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email enviado exitosamente' 
    });
  } catch (error) {
    console.error('Error sending quote email:', error);
    return NextResponse.json(
      { success: false, message: 'Error al enviar el email' },
      { status: 500 }
    );
  }
}



