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

// Interfaz para los datos del email
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Función para enviar emails
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

// Función para enviar email de bienvenida
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
          <h1>¡Bienvenido a Tenemos Filo!</h1>
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

// Función para enviar email de recuperación de contraseña
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
          <h1>Recuperar Contraseña</h1>
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

// Función para enviar email de verificación de email
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
          <h1>Verificar tu Email</h1>
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
