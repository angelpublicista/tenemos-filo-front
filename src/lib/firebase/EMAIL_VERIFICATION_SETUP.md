# Configuración de Verificación de Email en Firebase

## 📧 Configuración en Firebase Console

### 1. Configurar Plantillas de Email

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Templates**
4. Configura la plantilla de **Email address verification**

### 2. Personalizar la Plantilla

```html
<!-- Ejemplo de plantilla personalizada -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verificar Email - Tenemos Filo</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://tenemosfilo.com/FILO-LOGO-ORGINAL.png" alt="Tenemos Filo" style="max-width: 180px;">
        </div>
        
        <h1 style="color: #f26726; text-align: center;">Verificar tu Email</h1>
        
        <p>¡Hola!</p>
        
        <p>Gracias por registrarte en Tenemos Filo. Para completar tu registro, necesitamos verificar tu dirección de email.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="%LINK%" style="background-color: #f26726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verificar Email
            </a>
        </div>
        
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">%LINK%</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
            Este email fue enviado desde Tenemos Filo<br>
            Si no creaste esta cuenta, puedes ignorar este mensaje.
        </p>
    </div>
</body>
</html>
```

### 3. Variables Disponibles

- `%LINK%`: URL de verificación (obligatorio)
- `%EMAIL%`: Email del usuario
- `%DISPLAY_NAME%`: Nombre del usuario (si está disponible)

### 4. Configurar Dominio de Acción

1. En Firebase Console, ve a **Authentication** > **Settings**
2. En la pestaña **Authorized domains**, asegúrate de incluir:
   - `localhost` (para desarrollo)
   - Tu dominio de producción (ej: `tenemosfilo.com`)

## 🔧 Configuración en el Código

### Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
# ... otras variables de Firebase
```

### Funcionalidades Implementadas

#### 1. Envío Automático en Registro
- ✅ Se envía automáticamente al registrarse
- ✅ No falla el registro si el email falla
- ✅ Log de confirmación/error

#### 2. Banner de Verificación
- ✅ Aparece solo para usuarios no verificados
- ✅ Botón para reenviar verificación
- ✅ Se puede descartar temporalmente
- ✅ Desaparece automáticamente cuando se verifica

#### 3. Página de Verificación
- ✅ Maneja el código `oobCode` de Firebase
- ✅ Estados: loading, success, error, invalid
- ✅ Redirección automática al dashboard
- ✅ Manejo de códigos expirados/inválidos

#### 4. Función Manual de Reenvío
- ✅ `sendVerificationEmail()` en AuthContext
- ✅ Validaciones: usuario autenticado y no verificado
- ✅ Manejo de errores traducidos

## 🎯 Flujo de Usuario

### Registro
1. Usuario se registra → `createUserWithEmailAndPassword()`
2. Automáticamente → `sendEmailVerification()`
3. Usuario recibe email de Firebase
4. Usuario accede al dashboard con banner de verificación

### Verificación
1. Usuario hace clic en el enlace del email
2. Redirige a `/verify-email?oobCode=...`
3. Se verifica automáticamente con `applyActionCode()`
4. Redirección al dashboard (banner desaparece)

### Reenvío Manual
1. Usuario hace clic en "Reenviar verificación"
2. Se llama a `sendVerificationEmail()`
3. Nuevo email enviado
4. Mensaje de confirmación temporal

## 🚨 Manejo de Errores

### Códigos de Error Comunes

- `auth/invalid-action-code`: Código inválido o ya usado
- `auth/expired-action-code`: Código expirado
- `auth/user-disabled`: Usuario deshabilitado
- `auth/user-not-found`: Usuario no encontrado

### Mensajes Traducidos

Todos los errores se traducen automáticamente al español usando `getTranslatedFirebaseError()`.

## 📱 Responsive y UX

- ✅ Banner responsive con botones adaptables
- ✅ Página de verificación mobile-friendly
- ✅ Iconos y estados visuales claros
- ✅ Mensajes temporales con auto-dismiss
- ✅ Loading states en todos los botones

## 🔒 Seguridad

- ✅ Validación del código `oobCode` antes de aplicar
- ✅ Manejo seguro de errores sin exponer detalles técnicos
- ✅ Verificación de usuario autenticado antes de reenviar
- ✅ No falla el registro principal si falla el email

## 📊 Monitoreo

Para monitorear el funcionamiento:

1. **Logs del servidor**: Confirman envío de emails
2. **Firebase Analytics**: Eventos de verificación
3. **Estados de usuario**: `user.emailVerified` en tiempo real
4. **Errores capturados**: En console para debugging

## 🎨 Personalización Adicional

### Cambiar Colores del Banner
```typescript
// En EmailVerificationBanner.tsx
<Alert color="info"> {/* warning, info, success */}
```

### Modificar Tiempo de Redirección
```typescript
// En verify-email/page.tsx
setTimeout(() => {
  router.push('/dashboard');
}, 5000); // Cambiar de 3000 a 5000ms
```

### Personalizar Mensajes
Todos los mensajes están en español y se pueden personalizar directamente en los componentes.
