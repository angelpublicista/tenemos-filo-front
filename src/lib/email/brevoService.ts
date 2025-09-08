import nodemailer from 'nodemailer';

// Configuración de Brevo SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.sendinblue.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASSWORD,
    },
  });
};

// Configuración de la API REST de Brevo para plantillas
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Interfaz para los datos del email
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Interfaz para enviar email con plantilla de Brevo
interface BrevoTemplateEmailData {
  to: string;
  templateId: number;
  params?: { [key: string]: string | number };
  subject?: string; // Opcional si la plantilla ya tiene asunto
}

// Función para enviar emails con HTML personalizado (SMTP)
export const sendEmail = async (emailData: EmailData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.BREVO_FROM_EMAIL || 'noreply@tenemosfilo.com',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''), // Convertir HTML a texto plano
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email enviado exitosamente:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new Error(`Error enviando email: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

// Función para enviar emails usando plantillas de Brevo (API REST)
export const sendTemplateEmail = async (templateData: BrevoTemplateEmailData) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    const payload = {
      sender: { 
        name: "Tenemos Filo", 
        email: process.env.BREVO_FROM_EMAIL || 'noreply@tenemosfilo.com' 
      },
      to: [{ email: templateData.to }],
      templateId: templateData.templateId,
      params: templateData.params || {},
      ...(templateData.subject && { subject: templateData.subject })
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error de Brevo API: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error enviando email con plantilla:', error);
    throw new Error(`Error enviando email con plantilla: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

// Función para enviar email de bienvenida usando plantilla de Brevo
export const sendWelcomeEmailWithTemplate = async (
  userEmail: string, 
  userName: string, 
  role: 'guest' | 'host',
  templateId?: number
) => {
  // Si se proporciona un templateId Y hay API key configurada, usar la plantilla de Brevo
  if (templateId && BREVO_API_KEY) {
    try {
      return await sendTemplateEmail({
        to: userEmail,
        templateId: templateId,
        params: {
          FIRSTNAME: userName,
          ROLE: role === 'host' ? 'Anfitrión' : 'Comensal',
          ROLE_BENEFITS: role === 'host' 
            ? 'Crear experiencias gastronómicas únicas, Gestionar tus eventos y reservas, Conectar con comensales apasionados'
            : 'Descubrir experiencias gastronómicas únicas, Reservar en eventos exclusivos, Conectar con anfitriones talentosos',
          APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'
        }
      });
    } catch {
      // Fallback automático si falla la plantilla
      return sendWelcomeEmail(userEmail, userName, role);
    }
  }
  
  // Fallback: usar HTML personalizado
  return sendWelcomeEmail(userEmail, userName, role);
};

// Función para enviar email de bienvenida (HTML personalizado)
export const sendWelcomeEmail = async (userEmail: string, userName: string, role: 'guest' | 'host') => {
  const roleText = role === 'host' ? 'Anfitrión' : 'Comensal';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Bienvenido a Tenemos Filo!</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f26726; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background-color: #f26726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/FILO-LOGO-ORGINAL.png" alt="Tenemos Filo" style="max-width: 180px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; background-color: white; padding: 10px; border-radius: 8px;">
          <h1 style="margin-top: 20px; margin-bottom: 0;">¡Bienvenido a Tenemos Filo!</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${userName}!</h2>
          <p>Te damos la bienvenida a Tenemos Filo, la plataforma que conecta a comensales con los mejores anfitriones gastronómicos.</p>
          
          <p>Tu cuenta ha sido registrada exitosamente como <strong>${roleText}</strong>.</p>
          
          <p>Con tu cuenta podrás:</p>
          <ul>
            ${role === 'host' 
              ? '<li>Crear experiencias gastronómicas únicas</li><li>Gestionar tus eventos y reservas</li><li>Conectar con comensales apasionados</li>'
              : '<li>Descubrir experiencias gastronómicas únicas</li><li>Reservar en eventos exclusivos</li><li>Conectar con anfitriones talentosos</li>'
            }
          </ul>
          
          <p>¡Comienza a explorar todo lo que Tenemos Filo tiene para ofrecerte!</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}" class="button">
            Ir a Tenemos Filo
          </a>
        </div>
        <div class="footer">
          <p>Este email fue enviado desde Tenemos Filo</p>
          <p>Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: '¡Bienvenido a Tenemos Filo!',
    html: html,
  });
};

// Función para enviar email de recuperación de contraseña usando plantilla de Brevo
export const sendPasswordResetEmailWithTemplate = async (
  userEmail: string, 
  resetToken: string, 
  templateId?: number
) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/reset-password?token=${resetToken}`;
  
  // Si se proporciona un templateId Y hay API key configurada, usar la plantilla de Brevo
  if (templateId && BREVO_API_KEY) {
    try {
      return await sendTemplateEmail({
        to: userEmail,
        templateId: templateId,
        params: {
          RESET_URL: resetUrl,
          APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'
        }
      });
    } catch {
      // Fallback automático si falla la plantilla
      return sendPasswordResetEmail(userEmail, resetToken);
    }
  }
  
  // Fallback: usar HTML personalizado
  return sendPasswordResetEmail(userEmail, resetToken);
};

// Función para enviar email de recuperación de contraseña (HTML personalizado)
export const sendPasswordResetEmail = async (userEmail: string, resetToken: string) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperar Contraseña - Tenemos Filo</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f26726; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background-color: #f26726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/FILO-LOGO-ORGINAL.png" alt="Tenemos Filo" style="max-width: 180px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; background-color: white; padding: 10px; border-radius: 8px;">
          <h1 style="margin-top: 20px; margin-bottom: 0;">Recuperar Contraseña</h1>
        </div>
        <div class="content">
          <h2>Hola,</h2>
          <p>Has solicitado restablecer tu contraseña en Tenemos Filo.</p>
          
          <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          
          <a href="${resetUrl}" class="button">
            Restablecer Contraseña
          </a>
          
          <div class="warning">
            <p><strong>Importante:</strong></p>
            <ul>
              <li>Este enlace expirará en 1 hora por seguridad</li>
              <li>Si no solicitaste este cambio, puedes ignorar este email</li>
              <li>Tu contraseña actual permanecerá sin cambios</li>
            </ul>
          </div>
          
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p>${resetUrl}</p>
        </div>
        <div class="footer">
          <p>Este email fue enviado desde Tenemos Filo</p>
          <p>Si no solicitaste este cambio, contacta con soporte.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Recuperar Contraseña - Tenemos Filo',
    html: html,
  });
};

// Función para enviar email de verificación usando plantilla de Brevo
export const sendEmailVerificationWithTemplate = async (
  userEmail: string, 
  verificationToken: string, 
  templateId?: number
) => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/verify-email?token=${verificationToken}`;
  
  // Si se proporciona un templateId Y hay API key configurada, usar la plantilla de Brevo
  if (templateId && BREVO_API_KEY) {
    try {
      return await sendTemplateEmail({
        to: userEmail,
        templateId: templateId,
        params: {
          VERIFICATION_URL: verificationUrl,
          APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'
        }
      });
    } catch {
      // Fallback automático si falla la plantilla
      return sendEmailVerification(userEmail, verificationToken);
    }
  }
  
  // Fallback: usar HTML personalizado
  return sendEmailVerification(userEmail, verificationToken);
};

// Función para enviar email de verificación (HTML personalizado)
export const sendEmailVerification = async (userEmail: string, verificationToken: string) => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificar Email - Tenemos Filo</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f26726; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background-color: #f26726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tenemosfilo.com'}/FILO-LOGO-ORGINAL.png" alt="Tenemos Filo" style="max-width: 180px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; background-color: white; padding: 10px; border-radius: 8px;">
          <h1 style="margin-top: 20px; margin-bottom: 0;">Verificar tu Email</h1>
        </div>
        <div class="content">
          <h2>¡Gracias por registrarte!</h2>
          <p>Para completar tu registro en Tenemos Filo, necesitamos verificar tu dirección de email.</p>
          
          <p>Haz clic en el botón de abajo para verificar tu cuenta:</p>
          
          <a href="${verificationUrl}" class="button">
            Verificar Email
          </a>
          
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p>${verificationUrl}</p>
        </div>
        <div class="footer">
          <p>Este email fue enviado desde Tenemos Filo</p>
          <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Verifica tu Email - Tenemos Filo',
    html: html,
  });
};
