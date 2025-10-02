# Configuración de Google reCAPTCHA v2

Este proyecto incluye implementación completa de Google reCAPTCHA v2 en las páginas de login y registro.

## 📋 Requisitos

1. **Cuenta de Google**: Necesitas una cuenta de Google
2. **Dominio registrado**: Para producción (localhost funciona para desarrollo)

## 🔧 Configuración paso a paso

### 1. Crear un proyecto de reCAPTCHA

1. Ve a [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"+ Create"**

### 2. Configurar el sitio

**Label**: `Tenemos Filo - Frontend`

**reCAPTCHA type**: `reCAPTCHA v2`

**Domains**: `localhost` (para desarrollo)

**Para producción**, agrega tus dominios reales:
- `tu-dominio.com`
- `www.tu-dominio.com`

### 3. Obtener las claves

Después de crear el sitio, obtienes:

- **Site Key**: Clave pública (visible en el frontend)
- **Secret Key**: Clave privada (solo para el backend)

### 4. Configurar variables de entorno

Crea/edita tu archivo `.env.local`:

```env
# Google reCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_site_key_de_recaptcha_aqui
RECAPTCHA_SECRET_KEY=tu_secret_key_de_recaptcha_aqui
```

## 🎯 Funcionalidad implementada

### ✅ Página de Login (`/login`)
- Componente reCAPTCHA antes del botón de login
- Verificación obligatoria antes de enviar el formulario
- Reset automático del CAPTCHA en caso de error
- Mensajes de error específicos para reCAPTCHA

### ✅ Página de Registro (`/register`)
- Componente reCAPTCHA antes del botón de registro
- Verificación obligatoria antes de enviar el formulario
- Reset automático del CAPTCHA en caso de error
- Funciona para ambos tipos: Anfitrión y Comensal

## 🛠️ Componentes técnicos

### `RecaptchaComponent`
- Componente reutilizable con `forwardRef`
- Maneja eventos: `onVerify`, `onExpire`, `onError`
- Configuración por defecto: tema claro, tamaño normal
- Reset automático en errores y expiración

### Verificación obligatoria
- Ambos formularios verifican que reCAPTCHA esté completado
- Error claro si no se completa la verificación
- No se envía el formulario sin verificación válida

## 🔄 Estados del reCAPTCHA

### Estados posibles:
1. **Sin completar**: Usuario debe hacer clic y completar
2. **Completado**: Token válido, formulario se puede enviar
3. **Expirado**: Token expirado, debe completar nuevamente
4. **Error**: Problema de carga, debe recargar página

## 🌐 Para producción

### Configuración adicional
1. Agrega tu dominio real en reCAPTCHA Admin Console
2. Usa las claves específicas para producción
3. Configura variables de entorno en tu hosting
4. Puedes usar diferentes claves para development/production

### Ejemplo de configuración multi-entorno:

```env
# Desarrollo
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le_xxx...localhost
RECAPTCHA_SECRET_KEY=6Le_xxx...localhost

# Producción
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le_yyy...production
RECAPTCHA_SECRET_KEY=6Le_yyy...production
```

## 🐛 Solución de problemas

### reCAPTCHA no se muestra:
- Verifica que `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` esté configurada
- Revisa que el dominio esté incluido en reCAPTCHA Admin Console
- Verifica que la clave sea correcta

### Error "Invalid site key":
- Confirma que estés usando la Site Key correcta
- Verifica que el dominio coincida con el configurado en reCAPTCHA
- Asegúrate de que la clave sea para reCAPTCHA v2

### reCAPTCHA expira frecuentemente:
- Esto es normal si el usuario tarda mucho en completar el formulario
- El componente maneja automáticamente la expiración
- Se muestra un mensaje claro al usuario

## 🔐 Seguridad adicional (futuro)

Para mayor seguridad, considera implementar:

1. **Verificación en el backend**: Usar la Secret Key para verificar tokens en el servidor
2. **Rate limiting**: Limitar intentos de login por IP
3. **Validación adicional**: Confirmar que el token reCAPTCHA sea válido antes de procesar

## 📝 Notas importantes

- El componente está optimizado para UX y se resetea automáticamente
- Solo se muestra cuando las variables de entorno están configuradas
- Compatible con diseño responsive de Flowbite React
- Maneja errores gracefully sin afectar la experiencia del usuario
