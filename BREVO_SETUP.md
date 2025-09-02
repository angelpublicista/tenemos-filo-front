# Configuración de Brevo (Sendinblue) para Emails Transaccionales

## 📧 Configuración de Brevo

### 1. Crear cuenta en Brevo
1. Ve a [Brevo](https://www.brevo.com/) y crea una cuenta
2. Verifica tu dominio de email (recomendado)

### 2. Obtener credenciales SMTP
1. Ve a **Settings** → **SMTP & API**
2. En la sección **SMTP**, copia:
   - **SMTP Login** (usuario)
   - **SMTP Password** (contraseña)

### 3. Configurar variables de entorno
Crea un archivo `.env.local` con:

```env
# Brevo SMTP Configuration
BREVO_SMTP_USER=tu_usuario_smtp_de_brevo
BREVO_SMTP_PASSWORD=tu_password_smtp_de_brevo
BREVO_FROM_EMAIL=noreply@tenemosfilo.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Funcionalidades Implementadas

### ✅ Email de Bienvenida
- Se envía automáticamente después del registro exitoso
- Incluye información personalizada según el rol (Anfitrión/Comensal)
- Diseño responsive con branding de Tenemos Filo

### ✅ Email de Recuperación de Contraseña
- Envía enlace seguro para reset de contraseña
- Token con expiración de 1 hora
- Diseño profesional con instrucciones claras

### ✅ Email de Verificación
- Verificación de dirección de email
- Token seguro para confirmar cuenta
- Diseño consistente con la marca

## 📁 Archivos Creados

### Servicios
- `src/lib/email/brevoService.ts` - Configuración SMTP y funciones de envío
- `src/app/api/email/route.ts` - API route para manejo de emails
- `src/hooks/useEmailService.ts` - Hook para usar desde componentes

### Templates de Email
- **Bienvenida**: Personalizado por rol
- **Reset Password**: Con enlace seguro
- **Verificación**: Para confirmar email

## 🔧 Configuración SMTP

```typescript
// Configuración de Brevo SMTP
const transporter = nodemailer.createTransporter({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});
```

## 📊 Monitoreo y Logs

### Logs de Éxito
```
Email enviado exitosamente: <messageId>
```

### Logs de Error
```
Error enviando email: <detalles del error>
```

## 🛡️ Seguridad

- **Tokens seguros** para reset de contraseña
- **Validación de entrada** en API routes
- **Manejo de errores** sin exponer información sensible
- **Fallback graceful** si el email falla

## 🎨 Personalización

### Colores de Marca
- **Primario**: `#f26726` (naranja Tenemos Filo)
- **Fondo**: `#f9f9f9` (gris claro)
- **Texto**: `#333` (gris oscuro)

### Responsive Design
- **Mobile-first** approach
- **Max-width**: 600px para emails
- **Fuentes**: Arial, sans-serif

## 🔄 Uso en Componentes

```typescript
import { useEmailService } from '@/hooks/useEmailService';

const { sendWelcomeEmail, loading, error } = useEmailService();

// Enviar email de bienvenida
const handleWelcomeEmail = async () => {
  const result = await sendWelcomeEmail(email, name, role);
  if (result.success) {
    console.log('Email enviado:', result.messageId);
  }
};
```

## 📈 Próximos Pasos

1. **Configurar dominio** en Brevo para mejor deliverability
2. **Implementar templates** adicionales (notificaciones, eventos)
3. **Agregar tracking** de apertura y clics
4. **Configurar webhooks** para eventos de email
5. **Implementar cola de emails** para mejor rendimiento

## 🚨 Troubleshooting

### Error: "Authentication failed"
- Verificar credenciales SMTP
- Confirmar que el usuario tiene permisos de envío

### Error: "Connection timeout"
- Verificar configuración de red
- Confirmar puerto 587 está abierto

### Error: "Rate limit exceeded"
- Implementar cola de emails
- Agregar delays entre envíos

