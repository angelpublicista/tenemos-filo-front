# Módulo CRM - Cotizaciones

## 📋 Descripción

El módulo CRM con submódulo de Cotizaciones permite a los anfitriones generar cotizaciones personalizadas para sus clientes potenciales de manera rápida y profesional.

## ✅ Archivos Creados

### Frontend
- `src/app/dashboard/crm/page.tsx` - Página principal del módulo CRM
- `src/app/dashboard/crm/cotizaciones/page.tsx` - Búsqueda y selección de experiencias
- `src/app/dashboard/crm/cotizaciones/generar/page.tsx` - Generación de cotización con datos del cliente

### Backend & Services
- `src/lib/sanity/quoteService.ts` - Servicio para buscar experiencias y gestionar cotizaciones
- `src/lib/email/quoteEmailService.ts` - Servicio para enviar emails de cotización
- `src/app/api/send-quote-email/route.ts` - Endpoint API para envío de emails

### Schema
- `src/schemas/quote.schema.ts` - Schema de Sanity para cotizaciones

## 🔧 Configuración Necesaria

### 1. Agregar Schema a Sanity

Debes agregar el schema de cotizaciones a tu proyecto de Sanity:

1. **Copia el archivo** `src/schemas/quote.schema.ts` a tu carpeta de schemas en el proyecto de Sanity

2. **Importa el schema** en tu archivo de schemas principal (usualmente `sanity.config.ts` o `schema.ts`):

\`\`\`typescript
import quote from './schemas/quote.schema'

export const schema = {
  types: [
    // ... tus otros schemas
    quote,
  ],
}
\`\`\`

3. **Despliega los cambios** a Sanity:
\`\`\`bash
# En tu proyecto de Sanity
npm run deploy
\`\`\`

### 2. Variables de Entorno

Asegúrate de tener configuradas las siguientes variables en tu `.env.local`:

\`\`\`env
# Brevo (para envío de emails)
BREVO_SMTP_USER=tu_usuario_smtp_de_brevo
BREVO_SMTP_PASSWORD=tu_password_smtp_de_brevo
BREVO_FROM_EMAIL=noreply@tenemosfilo.com
\`\`\`

## 🚀 Cómo Usar el Módulo

### Paso 1: Acceder al Módulo CRM
1. Navega a **Dashboard → CRM** desde el menú lateral (necesitarás agregarlo al menú)
2. Verás tres módulos: Cotizaciones (disponible), Clientes y Seguimiento (próximamente)

### Paso 2: Buscar Experiencias
1. Haz clic en **Cotizaciones**
2. Completa el formulario con los datos del evento:
   - **Fecha del Evento** (obligatorio)
   - **Hora del Evento** (obligatorio)
   - **Cantidad de Personas** (obligatorio)
   - **Ubicación** (opcional)
3. Haz clic en **Buscar Experiencias**

### Paso 3: Seleccionar Experiencias
1. El sistema mostrará las experiencias disponibles que cumplan con los criterios
2. Selecciona hasta **3 experiencias** haciendo clic en las tarjetas
3. Las experiencias seleccionadas se marcarán con un ✓
4. Haz clic en **Generar Cotización**

### Paso 4: Completar Datos del Cliente
1. Ingresa los datos del cliente:
   - **Nombre Completo** (obligatorio)
   - **Email** (obligatorio)
   - **Teléfono** (opcional)
   - **Notas Adicionales** (opcional)
2. Revisa el resumen de la cotización en el panel derecho
3. Haz clic en **Enviar Cotización por Email**

### Paso 5: Email Enviado
- El cliente recibirá un email profesional con:
  - Datos del evento
  - Detalles de cada experiencia seleccionada
  - Precio por persona y total
  - Notas adicionales
  - Botón para responder
- La cotización se guarda en Sanity para seguimiento

## 📊 Características Implementadas

### Filtrado Inteligente
El sistema filtra experiencias según:
- ✅ Capacidad (min y máx de personas)
- ✅ Estado activo
- ✅ Empresa del anfitrión
- ✅ Ubicación (si se especifica)

### Validaciones
- ✅ Máximo 3 experiencias por cotización
- ✅ Validación de datos obligatorios
- ✅ Validación de email del cliente
- ✅ Fecha mínima (hoy o posterior)

### Email Profesional
- ✅ Diseño responsive
- ✅ Colores de marca Cortés Rueda
- ✅ Detalles completos de cada experiencia
- ✅ Cálculo automático de totales
- ✅ Notas personalizables

### Persistencia de Datos
- ✅ Cotizaciones guardadas en Sanity
- ✅ Estados de cotización (pendiente, enviada, aceptada, etc.)
- ✅ Relación con empresa y anfitrión
- ✅ Historial de cotizaciones

## 🎨 Soporte de Temas

Todo el módulo tiene soporte completo para:
- ☀️ Modo Light (por defecto)
- 🌙 Modo Dark

## 📱 Responsive

El módulo es completamente responsive y funciona en:
- 📱 Móviles
- 📱 Tablets
- 💻 Desktop

## 🔮 Módulos Futuros

Los siguientes módulos están preparados pero no implementados:
- **Clientes**: Gestión de base de datos de clientes
- **Seguimiento**: Seguimiento de oportunidades y pipeline de ventas

## 🔗 Agregar al Menú de Navegación

Para agregar el módulo CRM al menú lateral del dashboard, puedes crear un componente de navegación o agregarlo manualmente donde tengas tu menú.

Ejemplo de enlace:
\`\`\`tsx
<Link href="/dashboard/crm">
  <HiOutlineDocumentText className="w-5 h-5" />
  CRM
</Link>
\`\`\`

## ⚠️ Notas Importantes

1. **El usuario debe tener una empresa configurada** para poder usar el módulo
2. **Las experiencias deben estar en estado "activo"** para aparecer en las búsquedas
3. **Los emails se envían usando Brevo SMTP** - asegúrate de tener las credenciales configuradas
4. **La cotización es válida por 7 días** (configurable en el email)

## 🐛 Troubleshooting

### No aparecen experiencias en la búsqueda
- Verifica que la empresa tenga experiencias activas
- Verifica que la capacidad de las experiencias cubra el número de personas solicitado
- Verifica los filtros de ubicación

### Error al enviar email
- Verifica las credenciales de Brevo en las variables de entorno
- Verifica que el email del remitente esté verificado en Brevo
- Revisa los logs del servidor

### Error "No se encontró información de empresa"
- El usuario debe completar el setup de empresa primero
- Navega a `/dashboard/company-setup` para configurar la empresa

## 📝 Próximas Mejoras Sugeridas

1. **Plantillas de cotización**: Permitir al anfitrión crear plantillas personalizadas
2. **Seguimiento de cotizaciones**: Ver qué cotizaciones fueron abiertas/leídas
3. **Recordatorios automáticos**: Enviar recordatorios a clientes que no han respondido
4. **Exportar a PDF**: Generar PDF de la cotización
5. **Firma digital**: Permitir firma digital de cotizaciones aceptadas

---

**¿Necesitas ayuda?** Revisa la documentación o contacta con el equipo de desarrollo.














