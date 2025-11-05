# ✅ Checklist para Verificar Configuración de Brevo

## 1. Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga estas variables configuradas:

```env
BREVO_SMTP_USER=tu_usuario_smtp
BREVO_SMTP_PASSWORD=tu_contraseña_smtp
BREVO_FROM_EMAIL=noreply@tenemosfilo.com
```

### Dónde obtener las credenciales:

1. Ve a [Brevo Dashboard](https://app.brevo.com)
2. Click en **Settings** (Configuración) → **SMTP & API**
3. En la sección **SMTP**:
   - **Login (Usuario)**: Copia este valor para `BREVO_SMTP_USER`
   - **Password (Contraseña)**: Genera o copia para `BREVO_SMTP_PASSWORD`

## 2. Verificar el Email de Origen

⚠️ **IMPORTANTE**: El email en `BREVO_FROM_EMAIL` debe estar:

### Opción A: Usar el dominio por defecto de Brevo
```env
BREVO_FROM_EMAIL=noreply@smtp-brevo.com
```
✅ Este siempre funciona sin configuración adicional

### Opción B: Usar tu propio dominio (recomendado)
```env
BREVO_FROM_EMAIL=noreply@tenemosfilo.com
```
⚠️ Requiere que tu dominio esté **verificado en Brevo**

#### Para verificar tu dominio en Brevo:

1. Ve a **Settings** → **Senders & IP**
2. Click en **Domains** → **Add a domain**
3. Ingresa tu dominio: `tenemosfilo.com`
4. Brevo te dará registros DNS (SPF, DKIM, DMARC) que debes agregar en tu proveedor de dominio
5. Espera la verificación (puede tardar hasta 24-48 horas)

## 3. Verificar Límites de Envío

### Plan Gratuito de Brevo:
- ✅ **300 emails por día**
- ✅ Sin límite de contactos
- ⚠️ Marca de Brevo en los emails

### Si llegaste al límite:
1. Ve a **Statistics** → **Email** en Brevo
2. Verifica cuántos emails has enviado hoy
3. Si llegaste al límite, espera hasta mañana o actualiza tu plan

## 4. Verificar Estado de la Cuenta

1. Ve a tu [Dashboard de Brevo](https://app.brevo.com)
2. Verifica que tu cuenta esté **activa** (no suspendida)
3. Verifica que no haya alertas o notificaciones importantes

## 5. Probar la Conexión SMTP

Con las mejoras que hice al código, cuando intentes enviar una cotización verás en la consola:

### ✅ Si todo está bien:
```
📧 Preparando envío de cotización a: cliente@email.com
📤 Desde: noreply@tenemosfilo.com
🏢 Usuario SMTP: tu_usuario_smtp
✅ Conexión SMTP verificada correctamente
📮 Enviando email...
✅ Email enviado exitosamente
📬 Message ID: <xxxxx>
```

### ❌ Si hay error de credenciales:
```
❌ Error al verificar conexión SMTP: Invalid login
```
**Solución**: Verifica que `BREVO_SMTP_USER` y `BREVO_SMTP_PASSWORD` sean correctos

### ❌ Si hay error de email de origen:
```
❌ Error: Sender email not verified
```
**Solución**: Usa `noreply@smtp-brevo.com` o verifica tu dominio

## 6. Revisar la Carpeta de Spam

A veces los emails llegan a spam. Pide al destinatario que revise:
- 📁 Carpeta de Spam/Correo no deseado
- 📁 Carpeta de Promociones (en Gmail)
- 📁 Carpeta de Actualizaciones (en Gmail)

## 7. Verificar en el Dashboard de Brevo

1. Ve a **Campaigns** → **Transactional** en Brevo
2. Aquí verás todos los emails enviados
3. Puedes ver si fueron:
   - ✅ **Delivered** (Entregado)
   - ⏳ **Pending** (Pendiente)
   - ❌ **Bounced** (Rebotado)
   - 📧 **Spam** (Marcado como spam)

## 8. Solución Rápida (mientras configuras tu dominio)

Si necesitas que funcione inmediatamente, usa temporalmente:

```env
BREVO_FROM_EMAIL=noreply@smtp-brevo.com
```

Este email funciona sin configuración adicional y te permitirá enviar mientras configuras tu dominio personalizado.

## 9. Reiniciar el Servidor

Después de cambiar las variables de entorno:

```bash
# Detén el servidor (Ctrl + C)
# Reinicia
npm run dev
```

## 🆘 Si Nada Funciona

1. **Revisa la consola del servidor** después de intentar enviar un email
2. **Copia el error completo** que aparece
3. **Verifica en Brevo Dashboard** → **Logs** para ver qué está pasando con los envíos
4. **Verifica que el email del destinatario sea válido**

## 📞 Contacto con Soporte de Brevo

Si todo lo anterior está correcto y sigue sin funcionar:
- Email: [contact@brevo.com](mailto:contact@brevo.com)
- Chat en vivo: Desde tu dashboard de Brevo


