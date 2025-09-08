// src/lib/email/brevoTemplates.ts

/**
 * Configuración de plantillas de Brevo
 * 
 * Para usar plantillas de Brevo:
 * 1. Ve a tu panel de Brevo > Campaigns > Email templates
 * 2. Crea una nueva plantilla o usa una existente
 * 3. Anota el ID de la plantilla (aparece en la URL cuando editas la plantilla)
 * 4. Configura las variables en la plantilla usando la sintaxis de Brevo: {{ params.VARIABLE_NAME }}
 * 5. Actualiza los IDs aquí
 */

export const BREVO_TEMPLATE_IDS = {
  // ID de la plantilla de bienvenida (reemplazar con tu ID real)
  WELCOME: process.env.BREVO_TEMPLATE_WELCOME_ID ? Number(process.env.BREVO_TEMPLATE_WELCOME_ID) : undefined,
  
  // ID de la plantilla de recuperación de contraseña (reemplazar con tu ID real)
  PASSWORD_RESET: process.env.BREVO_TEMPLATE_PASSWORD_RESET_ID ? Number(process.env.BREVO_TEMPLATE_PASSWORD_RESET_ID) : undefined,
  
  // ID de la plantilla de verificación de email (reemplazar con tu ID real)
  EMAIL_VERIFICATION: process.env.BREVO_TEMPLATE_EMAIL_VERIFICATION_ID ? Number(process.env.BREVO_TEMPLATE_EMAIL_VERIFICATION_ID) : undefined,
} as const;

/**
 * Variables disponibles para cada plantilla
 * 
 * Estas son las variables que puedes usar en tus plantillas de Brevo:
 * - En la plantilla de Brevo, usa la sintaxis: {{ params.VARIABLE_NAME }}
 * - Por ejemplo: {{ params.FIRSTNAME }}, {{ params.ROLE }}, etc.
 */
export const TEMPLATE_VARIABLES = {
  WELCOME: {
    FIRSTNAME: 'Nombre del usuario',
    ROLE: 'Rol del usuario (Anfitrión o Comensal)',
    ROLE_BENEFITS: 'Beneficios específicos del rol',
    APP_URL: 'URL de la aplicación',
  },
  PASSWORD_RESET: {
    RESET_URL: 'URL para restablecer contraseña',
    APP_URL: 'URL de la aplicación',
  },
  EMAIL_VERIFICATION: {
    VERIFICATION_URL: 'URL para verificar email',
    APP_URL: 'URL de la aplicación',
  },
} as const;

/**
 * Helper para verificar si las plantillas están configuradas
 */
export const isTemplateConfigured = (templateType: keyof typeof BREVO_TEMPLATE_IDS): boolean => {
  return BREVO_TEMPLATE_IDS[templateType] !== undefined;
};

/**
 * Helper para obtener el ID de una plantilla
 */
export const getTemplateId = (templateType: keyof typeof BREVO_TEMPLATE_IDS): number | undefined => {
  return BREVO_TEMPLATE_IDS[templateType];
};
