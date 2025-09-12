# 🔧 Solución: Error 400 en Verificación de Email de Firebase

## 🚨 **Problema Identificado**

El error 400 (Bad Request) en `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode` indica que Firebase está rechazando la solicitud de envío de email de verificación.

## 🔍 **Causas Más Comunes**

### 1. **Dominio No Autorizado** ⚠️ (Más Probable)
- Firebase solo permite enviar emails desde dominios autorizados
- Si estás ejecutando en un dominio diferente al configurado, Firebase rechazará la solicitud

### 2. **API Key Incorrecta**
- La API Key de Firebase no es válida o ha expirado
- Variables de entorno mal configuradas

### 3. **Configuración de Firebase Incompleta**
- Faltan variables de entorno requeridas
- Configuración de proyecto incorrecta

## 🛠️ **Soluciones Paso a Paso**

### **Paso 1: Verificar Dominios Autorizados** (CRÍTICO)

1. **Accede a Firebase Console:**
   - Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
   - Selecciona tu proyecto

2. **Configura Dominios Autorizados:**
   - Ve a **Authentication** → **Settings**
   - En la pestaña **Authorized domains**
   - Asegúrate de incluir:
     - `localhost` (para desarrollo local)
     - Tu dominio de pruebas (ej: `tu-dominio-pruebas.com`)
     - Cualquier subdominio que estés usando

3. **Dominios Comunes para Agregar:**
   ```
   localhost
   127.0.0.1
   tu-dominio-pruebas.com
   www.tu-dominio-pruebas.com
   ```

### **Paso 2: Verificar Variables de Entorno**

Asegúrate de que tu archivo `.env.local` tenga todas las variables correctas:

```bash
# Firebase Configuration (OBLIGATORIAS)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_real_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://tu-dominio-pruebas.com
```

### **Paso 3: Verificar API Key**

1. **Obtén la API Key correcta:**
   - Ve a Firebase Console → **Project Settings** → **General**
   - Copia la **Web API Key** (no la Server Key)

2. **Verifica que sea válida:**
   - Debe empezar con `AIzaSy...`
   - No debe tener restricciones de dominio que bloqueen tu uso

### **Paso 4: Reiniciar la Aplicación**

Después de hacer cambios en Firebase Console:
```bash
# Detener el servidor
Ctrl + C

# Limpiar caché
npm run build

# Reiniciar
npm run dev
```

## 🔧 **Mejoras Implementadas**

### **1. Mejor Manejo de Errores**
- Mensajes de error más específicos en español
- Logs detallados en consola para debugging
- Información específica sobre errores de dominio

### **2. Componente de Debugging**
- `FirebaseDebugInfo` muestra información detallada del error
- Instrucciones específicas de solución
- Solo visible en ambiente de desarrollo

### **3. Logs Mejorados**
- Información del dominio actual en logs
- Códigos de error específicos de Firebase
- Sugerencias de solución automáticas

## 🧪 **Cómo Probar la Solución**

### **1. Verificar en Consola del Navegador**
Después de intentar enviar el email de verificación, revisa la consola para ver:
```
Enviando email de verificación desde dominio: tu-dominio.com
```

### **2. Verificar Errores Específicos**
Si hay error, verás:
```
Error detallado en sendVerificationEmail: [objeto de error]
Código de error Firebase: auth/unauthorized-domain
SOLUCIÓN: Agrega el dominio actual a los dominios autorizados...
```

### **3. Usar el Componente de Debugging**
En ambiente de desarrollo, si hay error, aparecerá un banner con:
- Descripción del problema
- Instrucciones paso a paso
- Detalles técnicos del error

## 🚀 **Verificación Final**

### **Checklist de Verificación:**
- [ ] Dominio agregado a Firebase Console → Authentication → Settings → Authorized domains
- [ ] Variables de entorno correctas en `.env.local`
- [ ] API Key válida y sin restricciones
- [ ] Aplicación reiniciada después de cambios
- [ ] No hay errores en consola del navegador
- [ ] Email de verificación se envía correctamente

## 📞 **Si el Problema Persiste**

### **Información para Debugging:**
1. **Captura de pantalla del error en Network tab**
2. **Dominio actual** (visible en logs de consola)
3. **Variables de entorno** (sin mostrar valores sensibles)
4. **Configuración de Firebase Console** (dominios autorizados)

### **Verificaciones Adicionales:**
- ¿El proyecto de Firebase está activo?
- ¿La API Key tiene permisos de Authentication?
- ¿Hay restricciones de IP en la API Key?
- ¿El usuario está autenticado correctamente?

## 🎯 **Prevención Futura**

### **Para Nuevos Ambientes:**
1. Siempre agregar el dominio a Firebase Console ANTES de desplegar
2. Verificar variables de entorno en cada ambiente
3. Usar diferentes proyectos de Firebase para desarrollo/producción
4. Documentar todos los dominios autorizados

### **Monitoreo:**
- Revisar logs de Firebase Console regularmente
- Configurar alertas para errores de autenticación
- Mantener lista actualizada de dominios autorizados
