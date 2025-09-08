# Servicio de Email con Brevo

Este módulo proporciona integración con Brevo (anteriormente Sendinblue) para el envío de emails transaccionales usando tanto SMTP como plantillas personalizadas.

## Configuración

### Variables de Entorno Requeridas

```bash
# SMTP Configuration (requerido)
BREVO_SMTP_USER=tu_usuario_smtp_de_brevo
BREVO_SMTP_PASSWORD=tu_password_smtp_de_brevo
BREVO_FROM_EMAIL=noreply@tenemosfilo.com

# API Configuration para plantillas (opcional)
BREVO_API_KEY=xkeysib-tu_api_key_aqui

# Template IDs (opcional)
BREVO_TEMPLATE_WELCOME_ID=1
BREVO_TEMPLATE_PASSWORD_RESET_ID=2
BREVO_TEMPLATE_EMAIL_VERIFICATION_ID=3

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Obtener Credenciales

1. **SMTP Credentials**: Ve a [Brevo > Settings > SMTP & API](https://app.brevo.com/settings/keys/smtp)
2. **API Key**: Ve a [Brevo > Settings > API Keys](https://app.brevo.com/settings/keys/api)

## Uso

### 1. Con HTML Personalizado (SMTP)

```typescript
import { sendWelcomeEmail } from '@/lib/email/brevoService';

// Envía email usando HTML personalizado
await sendWelcomeEmail('user@example.com', 'Juan Pérez', 'guest');
```

### 2. Con Plantillas de Brevo (API REST)

```typescript
import { sendWelcomeEmailWithTemplate } from '@/lib/email/brevoService';

// Envía email usando plantilla de Brevo
await sendWelcomeEmailWithTemplate(
  'user@example.com', 
  'Juan Pérez', 
  'guest',
  1 // Template ID
);
```

### 3. Usando el Hook de React

```typescript
import { useEmailService } from '@/hooks/useEmailService';

const { sendWelcomeEmail, loading, error } = useEmailService();

// Con HTML personalizado
await sendWelcomeEmail('user@example.com', 'Juan Pérez', 'guest');

// Con plantilla de Brevo
await sendWelcomeEmail('user@example.com', 'Juan Pérez', 'guest', {
  useTemplate: true,
  templateId: 1
});
```

## Crear Plantillas en Brevo

### Paso 1: Crear la Plantilla

1. Ve a tu panel de Brevo
2. Navega a **Campaigns** > **Email templates**
3. Haz clic en **Create a template**
4. Diseña tu plantilla usando el editor drag & drop

### Paso 2: Configurar Variables

En tu plantilla de Brevo, puedes usar estas variables:

#### Email de Bienvenida
```html
<h1>¡Hola {{ params.FIRSTNAME }}!</h1>
<p>Bienvenido como {{ params.ROLE }}</p>
<p>{{ params.ROLE_BENEFITS }}</p>
<a href="{{ params.APP_URL }}">Ir a la app</a>
```

#### Recuperación de Contraseña
```html
<h1>Recuperar Contraseña</h1>
<a href="{{ params.RESET_URL }}">Restablecer contraseña</a>
<p>Visita {{ params.APP_URL }}</p>
```

#### Verificación de Email
```html
<h1>Verifica tu email</h1>
<a href="{{ params.VERIFICATION_URL }}">Verificar email</a>
<p>Visita {{ params.APP_URL }}</p>
```

### Paso 3: Obtener el Template ID

1. Después de crear la plantilla, ve a la lista de plantillas
2. Haz clic en **Edit** en tu plantilla
3. El ID aparecerá en la URL: `...templates/edit/123` (el ID es 123)
4. Actualiza las variables de entorno con estos IDs

## Variables Disponibles por Plantilla

### Welcome Email
- `FIRSTNAME`: Nombre del usuario
- `ROLE`: Rol del usuario (Anfitrión o Comensal)  
- `ROLE_BENEFITS`: Beneficios específicos del rol
- `APP_URL`: URL de la aplicación

### Password Reset
- `RESET_URL`: URL completa para restablecer contraseña
- `APP_URL`: URL de la aplicación

### Email Verification  
- `VERIFICATION_URL`: URL completa para verificar email
- `APP_URL`: URL de la aplicación

## Fallback Automático

Si no se configuran las plantillas de Brevo, el sistema automáticamente usará HTML personalizado como fallback, garantizando que los emails siempre se envíen.

## Ejemplo de Integración Completa

```typescript
// En tu componente de registro
import { useEmailService } from '@/hooks/useEmailService';
import { getTemplateId, isTemplateConfigured } from '@/lib/email/brevoTemplates';

const { sendWelcomeEmail } = useEmailService();

const handleRegistration = async (userData) => {
  // ... lógica de registro ...
  
  // Enviar email de bienvenida
  const welcomeTemplateId = getTemplateId('WELCOME');
  
  await sendWelcomeEmail(
    userData.email, 
    userData.name, 
    userData.role,
    isTemplateConfigured('WELCOME') ? {
      useTemplate: true,
      templateId: welcomeTemplateId
    } : undefined
  );
};
```

## Ventajas de las Plantillas de Brevo

1. **Editor Visual**: Diseña emails sin código
2. **Responsive**: Automáticamente optimizado para móviles
3. **Gestión Centralizada**: Actualiza plantillas sin deployar código
4. **Analytics**: Estadísticas de apertura y clicks
5. **Personalización Avanzada**: Variables dinámicas y lógica condicional
