# Sistema de Disponibilidad por Sede

Este módulo permite a los anfitriones gestionar calendarios de disponibilidad para cada una de sus sedes.

> **⚠️ NOTA IMPORTANTE:** Actualmente esta sección está funcionando con **datos de ejemplo (mock data)**. Las operaciones de crear, editar, eliminar y actualizar calendarios simulan las interacciones pero no persisten los datos en Sanity. Para conectar con Sanity, necesitarás implementar el schema correspondiente en tu Sanity Studio (ver sección "Consideraciones para Sanity" más abajo).

## Características Principales

### 1. **Múltiples Calendarios por Sede**
- Cada sede puede tener múltiples calendarios de disponibilidad
- Un calendario puede ser marcado como "principal" (solo uno por sede)
- Los calendarios pueden activarse/desactivarse sin eliminarlos

### 2. **Configuración de Horario Semanal**
- Definir disponibilidad para cada día de la semana
- Múltiples franjas horarias por día
- Activar/desactivar días específicos

### 3. **Fechas Bloqueadas**
- Bloquear fechas específicas (ej: vacaciones, días festivos)
- Bloqueos de día completo o por franja horaria
- Agregar razones/notas para los bloqueos

### 4. **Configuración Avanzada**
- **Buffer Time**: Tiempo de espera entre reservas consecutivas
- **Aviso Mínimo**: Anticipación mínima requerida para hacer una reserva
- **Máxima Anticipación**: Hasta cuándo se puede reservar con anticipación
- **Zona Horaria**: Configuración de zona horaria por calendario

## Estructura de Datos

### AvailabilitySchedule
```typescript
{
  _id: string;
  name: string; // Nombre del calendario
  location: Reference; // Referencia a la sede
  company: Reference; // Referencia a la empresa
  isActive: boolean; // Si está activo
  isPrimary: boolean; // Si es el calendario principal
  weekSchedule: DaySchedule[]; // Horario semanal
  blockedDates: BlockedDate[]; // Fechas bloqueadas
  timezone: string; // Zona horaria
  bufferTime: number; // Minutos entre reservas
  minBookingNotice: number; // Horas de aviso mínimo
  maxBookingAdvance: number; // Días máximos de anticipación
  notes: string; // Notas adicionales
}
```

### DaySchedule
```typescript
{
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isActive: boolean;
  timeSlots: TimeSlot[];
}
```

### TimeSlot
```typescript
{
  startTime: string; // Formato HH:mm (24h)
  endTime: string; // Formato HH:mm (24h)
  isAvailable: boolean;
}
```

### BlockedDate
```typescript
{
  date: string; // ISO date
  reason?: string;
  allDay: boolean;
  startTime?: string; // Si no es todo el día
  endTime?: string; // Si no es todo el día
}
```

## Servicios Disponibles

### `createAvailabilitySchedule(data)`
Crea un nuevo calendario de disponibilidad para una sede.

### `getAvailabilityScheduleById(scheduleId)`
Obtiene un calendario específico por su ID.

### `getAvailabilitySchedulesByLocation(locationId)`
Obtiene todos los calendarios de una sede específica.

### `getAvailabilitySchedulesByCompany(companyId)`
Obtiene todos los calendarios de una empresa (todas sus sedes).

### `updateAvailabilitySchedule(data)`
Actualiza un calendario existente.

### `deleteAvailabilitySchedule(scheduleId)`
Elimina un calendario de disponibilidad.

### `setPrimarySchedule(scheduleId, locationId)`
Establece un calendario como principal para una sede.

### `getPrimaryScheduleByLocation(locationId)`
Obtiene el calendario principal activo de una sede.

### `generateDefaultSchedule()`
Genera un horario de trabajo estándar (Lunes a Viernes, 9:00-13:00 y 14:00-18:00).

## Componentes UI

### `AvailabilityManager`
Componente principal que gestiona los calendarios de una sede específica.

**Props:**
- `location: Location` - La sede para la cual gestionar disponibilidad
- `companyId: string` - ID de la empresa

**Características:**
- Lista de calendarios existentes
- Crear nuevos calendarios
- Editar calendarios existentes
- Eliminar calendarios
- Establecer calendario como principal
- Activar/desactivar calendarios

### Página: `/dashboard/availability`
Página completa del dashboard que permite:
- Seleccionar una sede del listado
- Gestionar la disponibilidad de la sede seleccionada
- Vista responsive con sidebar para selección de sedes

## Uso en el Dashboard

La sección de disponibilidad está integrada en el sidebar del dashboard y solo es visible para usuarios con rol de "host".

**Ruta:** `/dashboard/availability`

## Flujo de Trabajo Recomendado

1. **Crear Primera Sede**: Los anfitriones deben tener al menos una sede registrada
2. **Crear Calendario Base**: Crear un calendario principal con horario estándar
3. **Personalizar**: Ajustar horarios según necesidades específicas
4. **Calendarios Adicionales**: Crear calendarios temporales (ej: "Horario Verano", "Horario Navideño")
5. **Bloqueos**: Agregar fechas bloqueadas según sea necesario

## Consideraciones para Sanity

### Schema Requerido
Para que esto funcione, necesitas agregar el siguiente schema en Sanity Studio:

```javascript
// schemas/availabilitySchedule.js
export default {
  name: 'availabilitySchedule',
  title: 'Calendario de Disponibilidad',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'location',
      title: 'Sede',
      type: 'reference',
      to: [{ type: 'location' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'company',
      title: 'Empresa',
      type: 'reference',
      to: [{ type: 'company' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'isActive',
      title: 'Activo',
      type: 'boolean',
      initialValue: true
    },
    {
      name: 'isPrimary',
      title: 'Principal',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'weekSchedule',
      title: 'Horario Semanal',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'day',
            title: 'Día',
            type: 'string',
            options: {
              list: [
                { title: 'Lunes', value: 'monday' },
                { title: 'Martes', value: 'tuesday' },
                { title: 'Miércoles', value: 'wednesday' },
                { title: 'Jueves', value: 'thursday' },
                { title: 'Viernes', value: 'friday' },
                { title: 'Sábado', value: 'saturday' },
                { title: 'Domingo', value: 'sunday' }
              ]
            }
          },
          {
            name: 'isActive',
            title: 'Activo',
            type: 'boolean'
          },
          {
            name: 'timeSlots',
            title: 'Franjas Horarias',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'startTime', title: 'Hora Inicio', type: 'string' },
                { name: 'endTime', title: 'Hora Fin', type: 'string' },
                { name: 'isAvailable', title: 'Disponible', type: 'boolean' }
              ]
            }]
          }
        ]
      }]
    },
    {
      name: 'blockedDates',
      title: 'Fechas Bloqueadas',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'date', title: 'Fecha', type: 'date' },
          { name: 'reason', title: 'Razón', type: 'string' },
          { name: 'allDay', title: 'Todo el día', type: 'boolean' },
          { name: 'startTime', title: 'Hora Inicio', type: 'string' },
          { name: 'endTime', title: 'Hora Fin', type: 'string' }
        ]
      }]
    },
    {
      name: 'timezone',
      title: 'Zona Horaria',
      type: 'string',
      initialValue: 'America/Bogota'
    },
    {
      name: 'bufferTime',
      title: 'Tiempo de Buffer (minutos)',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'minBookingNotice',
      title: 'Aviso Mínimo (horas)',
      type: 'number',
      initialValue: 24
    },
    {
      name: 'maxBookingAdvance',
      title: 'Máxima Anticipación (días)',
      type: 'number',
      initialValue: 90
    },
    {
      name: 'notes',
      title: 'Notas',
      type: 'text'
    },
    {
      name: 'createdAt',
      title: 'Creado',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    },
    {
      name: 'updatedAt',
      title: 'Actualizado',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }
  ]
}
```

## Próximas Mejoras

- [ ] Vista de calendario visual para gestión de disponibilidad
- [ ] Importar/exportar calendarios
- [ ] Plantillas de calendarios predefinidas
- [ ] Sincronización con calendarios externos (Google Calendar, Outlook)
- [ ] Notificaciones de cambios en disponibilidad
- [ ] Reportes de disponibilidad utilizada vs disponible
- [ ] Sugerencias inteligentes basadas en patrones de reserva

