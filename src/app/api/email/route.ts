import { NextRequest, NextResponse } from 'next/server';
import { 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  sendWelcomeEmailWithTemplate,
  sendPasswordResetEmailWithTemplate,
  sendEmailVerificationWithTemplate
} from '@/lib/email/brevoService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, name, role, token, useTemplate } = body;
    
    // Convertir templateId a number si está presente
    const templateId = body.templateId ? Number(body.templateId) : undefined;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'welcome':
        if (!name || !role) {
          return NextResponse.json(
            { error: 'Nombre y rol son requeridos para email de bienvenida' },
            { status: 400 }
          );
        }
        // Usar plantilla de Brevo si se especifica
        if (useTemplate && templateId && !isNaN(templateId)) {
          result = await sendWelcomeEmailWithTemplate(email, name, role, templateId);
        } else {
          result = await sendWelcomeEmail(email, name, role);
        }
        break;

      case 'password-reset':
        if (!token) {
          return NextResponse.json(
            { error: 'Token es requerido para reset de contraseña' },
            { status: 400 }
          );
        }
        // Usar plantilla de Brevo si se especifica
        if (useTemplate && templateId && !isNaN(templateId)) {
          result = await sendPasswordResetEmailWithTemplate(email, token, templateId);
        } else {
          result = await sendPasswordResetEmail(email, token);
        }
        break;

      case 'email-verification':
        if (!token) {
          return NextResponse.json(
            { error: 'Token es requerido para verificación de email' },
            { status: 400 }
          );
        }
        // Usar plantilla de Brevo si se especifica
        if (useTemplate && templateId && !isNaN(templateId)) {
          result = await sendEmailVerificationWithTemplate(email, token, templateId);
        } else {
          result = await sendEmailVerification(email, token);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de email no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error en API de email:', error);
    return NextResponse.json(
      { 
        error: 'Error enviando email',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

