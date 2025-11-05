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
    } = data;

    // Validar variables de entorno
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
      console.error('❌ Credenciales de Brevo no configuradas');
      return NextResponse.json(
        { success: false, message: 'Configuración de email incompleta. Verifica las credenciales de Brevo.' },
        { status: 500 }
      );
    }

    if (!process.env.BREVO_FROM_EMAIL) {
      console.error('❌ Email de origen no configurado');
      return NextResponse.json(
        { success: false, message: 'Email de origen no configurado.' },
        { status: 500 }
      );
    }

    console.log('📧 Preparando envío de cotización a:', customerEmail);
    console.log('📤 Desde:', process.env.BREVO_FROM_EMAIL);
    console.log('🏢 Usuario SMTP:', process.env.BREVO_SMTP_USER);

    // Configurar transporte de email con Brevo
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.sendinblue.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });

    // Verificar conexión SMTP
    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada correctamente');
    } catch (verifyError) {
      console.error('❌ Error al verificar conexión SMTP:', verifyError);
      return NextResponse.json(
        { success: false, message: 'Error al conectar con el servidor de email. Verifica tus credenciales.' },
        { status: 500 }
      );
    }

    // Generar HTML del email con opciones separadas
    const experiencesHTML = (experiences as ExperienceForEmail[]).map((exp, index) => `
      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <div style="background: linear-gradient(135deg, #F26726 0%, #E23694 100%); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">Opción ${index + 1}</h3>
        </div>
        
        <h4 style="color: #334C5D; margin: 0 0 10px 0; font-size: 18px;">${exp.title}</h4>
        <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">${exp.description}</p>
        
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 15px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
          <div>
            <p style="margin: 5px 0; color: #6b7280;">
              <strong style="color: #334C5D;">⏱️ Duración:</strong> ${exp.duration} minutos
            </p>
            <p style="margin: 5px 0; color: #6b7280;">
              <strong style="color: #334C5D;">👥 Capacidad:</strong> ${exp.minCapacity || 1} - ${exp.capacity} personas
            </p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #6b7280; font-size: 13px;">
              $${exp.basePrice.toLocaleString()} ${exp.currency} × ${guests} personas
            </p>
            <p style="margin: 5px 0; color: #F26726; font-size: 20px; font-weight: bold;">
              $${(exp.basePrice * guests).toLocaleString()} ${exp.currency}
            </p>
          </div>
        </div>
        
        ${exp.includes && exp.includes.length > 0 ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #065f46; font-weight: 600; font-size: 14px;">✓ Esta opción incluye:</p>
            <ul style="margin: 0; padding-left: 20px; color: #047857;">
              ${exp.includes.map((item: string) => `<li style="margin: 5px 0;">${item}</li>`).join('')}
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

            <!-- Opciones de Experiencias -->
            <h2 style="color: #334C5D; margin: 0 0 10px 0; font-size: 22px;">🎯 Opciones para tu Evento</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 25px 0; line-height: 1.6;">
              A continuación encontrarás ${experiences.length} ${experiences.length === 1 ? 'opción' : 'opciones diferentes'} que hemos preparado especialmente para tu evento. Cada opción incluye el precio total para ${guests} personas.
            </p>
            
            ${experiencesHTML}

            ${notes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📝 Notas Adicionales</h3>
                <p style="color: #78350f; margin: 0; white-space: pre-wrap; line-height: 1.6;">${notes}</p>
              </div>
            ` : ''}

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 40px; background-color: #f9fafb; padding: 30px; border-radius: 12px;">
              <p style="color: #334C5D; font-size: 16px; margin-bottom: 15px; font-weight: 600;">
                ¿Cuál opción te gusta más? 💬
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 25px; line-height: 1.6;">
                Responde este correo indicando la opción de tu preferencia o si deseas combinar elementos de diferentes opciones. ¡Estamos para ayudarte a crear el evento perfecto!
              </p>
              <a href="mailto:${process.env.BREVO_FROM_EMAIL}" 
                 style="display: inline-block; background: linear-gradient(135deg, #F26726 0%, #E23694 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(242, 103, 38, 0.3);">
                Responder al Anfitrión
              </a>
            </div>

            <!-- Nota al pie -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 5px 0;">
                Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.
              </p>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                Cada opción muestra el precio total para ${guests} ${guests === 1 ? 'persona' : 'personas'}.
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
    console.log('📮 Enviando email...');
    const mailOptions = {
      from: `"${companyName}" <${process.env.BREVO_FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Cotización para tu evento - ${new Date(eventDate).toLocaleDateString('es-ES')}`,
      html: emailHTML,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente');
    console.log('📬 Message ID:', info.messageId);
    console.log('📊 Response:', info.response);
    console.log('👤 Destinatario:', customerEmail);

    return NextResponse.json({ 
      success: true, 
      message: 'Email enviado exitosamente',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('❌ Error completo al enviar email:', error);
    
    // Proporcionar mensaje de error más detallado
    let errorMessage = 'Error al enviar el email';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      console.error('📋 Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}



