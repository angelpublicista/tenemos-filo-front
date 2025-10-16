# Guía de Migración: De Mock Data a Sanity

Esta guía te ayudará a migrar la sección de Disponibilidad desde datos de ejemplo a datos reales conectados con Sanity.

## Estado Actual

Actualmente, la sección de Disponibilidad utiliza datos de ejemplo (mock data) en:
- `src/app/dashboard/availability/page.tsx` - Mock locations
- `src/components/AvailabilityManager.tsx` - Mock schedules

## Pasos para la Migración

### 1. Configurar Schema en Sanity Studio

Crea el archivo `schemas/availabilitySchedule.js` en tu proyecto de Sanity Studio:

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

Luego importa el schema en tu `schema.js`:

```javascript
import availabilitySchedule from './availabilitySchedule'

export default createSchema({
  name: 'default',
  types: schemaTypes.concat([
    // ... otros schemas
    availabilitySchedule
  ])
})
```

### 2. Actualizar la Página de Disponibilidad

En `src/app/dashboard/availability/page.tsx`:

**ANTES (Mock Data):**
```typescript
import { Location } from '@/types';

const mockLocations: Location[] = [ /* ... */ ];

const loadLocations = async () => {
  try {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLocations(mockLocations);
    // ...
  }
};
```

**DESPUÉS (Datos Reales):**
```typescript
import { getLocationsByCompany } from '@/lib/sanity/locationService';

const loadLocations = async () => {
  if (!sanityUser?.companyId) return;
  
  try {
    setLoading(true);
    const data = await getLocationsByCompany(sanityUser.companyId);
    setLocations(data);
    
    if (data.length > 0) {
      const mainLocation = data.find(loc => loc.isMain) || data[0];
      setSelectedLocation(mainLocation);
    }
  } catch (error) {
    console.error('Error loading locations:', error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Actualizar el Componente AvailabilityManager

En `src/components/AvailabilityManager.tsx`:

**ANTES (Mock Data):**
```typescript
import { generateDefaultSchedule } from '@/lib/sanity/availabilityService';

const generateMockSchedules = (locationId: string, companyId: string): AvailabilitySchedule[] => {
  // ... mock data
};

const loadSchedules = async () => {
  try {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    const mockData = generateMockSchedules(location._id, companyId);
    setSchedules(mockData);
  } // ...
};
```

**DESPUÉS (Datos Reales):**
```typescript
import {
  getAvailabilitySchedulesByLocation,
  createAvailabilitySchedule,
  updateAvailabilitySchedule,
  deleteAvailabilitySchedule,
  setPrimarySchedule,
  generateDefaultSchedule
} from '@/lib/sanity/availabilityService';

const loadSchedules = async () => {
  try {
    setLoading(true);
    const data = await getAvailabilitySchedulesByLocation(location._id);
    setSchedules(data);
  } catch (error) {
    showError('Error al cargar los calendarios de disponibilidad');
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

**Actualizar handleDeleteSchedule:**
```typescript
const handleDeleteSchedule = async (scheduleId: string) => {
  const confirmed = await showConfirm(
    '¿Estás seguro?',
    'Esta acción no se puede deshacer',
    'Sí, eliminar'
  );

  if (confirmed) {
    try {
      showLoading('Eliminando calendario...');
      await deleteAvailabilitySchedule(scheduleId);
      await loadSchedules();
      showSuccess('Calendario eliminado exitosamente');
    } catch (error) {
      showError('Error al eliminar el calendario');
      console.error(error);
    }
  }
};
```

**Actualizar handleSetPrimary:**
```typescript
const handleSetPrimary = async (scheduleId: string) => {
  try {
    showLoading('Estableciendo como principal...');
    await setPrimarySchedule(scheduleId, location._id);
    await loadSchedules();
    showSuccess('Calendario establecido como principal');
  } catch (error) {
    showError('Error al establecer el calendario como principal');
    console.error(error);
  }
};
```

**Actualizar handleToggleActive:**
```typescript
const handleToggleActive = async (schedule: AvailabilitySchedule) => {
  try {
    showLoading(schedule.isActive ? 'Desactivando...' : 'Activando...');
    await updateAvailabilitySchedule({
      _id: schedule._id,
      isActive: !schedule.isActive,
    });
    await loadSchedules();
    showSuccess(
      schedule.isActive 
        ? 'Calendario desactivado exitosamente' 
        : 'Calendario activado exitosamente'
    );
  } catch (error) {
    showError('Error al actualizar el calendario');
    console.error(error);
  }
};
```

**Actualizar handleSave en ScheduleModal:**
```typescript
const handleSave = async () => {
  if (!name.trim()) {
    showError('Por favor ingresa un nombre para el calendario');
    return;
  }

  try {
    setSaving(true);
    
    if (schedule) {
      // Update existing schedule
      await updateAvailabilitySchedule({
        _id: schedule._id,
        name,
        weekSchedule,
        blockedDates,
        notes,
        bufferTime,
        minBookingNotice,
      });
      showSuccess('Calendario actualizado exitosamente');
    } else {
      // Create new schedule
      await createAvailabilitySchedule({
        name,
        locationId,
        companyId,
        weekSchedule,
        blockedDates,
        notes,
        bufferTime,
        minBookingNotice,
      });
      showSuccess('Calendario creado exitosamente');
    }
    
    onSave();
  } catch (error) {
    showError('Error al guardar el calendario');
    console.error(error);
  } finally {
    setSaving(false);
  }
};
```

### 4. Desplegar y Verificar

1. **Desplegar el schema en Sanity Studio**
   ```bash
   cd tu-sanity-studio
   sanity deploy
   ```

2. **Verificar la conexión**
   - Accede a tu Sanity Studio
   - Verifica que aparezca el nuevo tipo de documento "Calendario de Disponibilidad"

3. **Probar la funcionalidad**
   - Crea un calendario de disponibilidad desde la UI
   - Verifica que se guarde en Sanity
   - Prueba editar, eliminar y cambiar el estado

### 5. Limpieza Opcional

Una vez que hayas verificado que todo funciona correctamente con Sanity:

1. Elimina la función `generateMockSchedules` de `AvailabilityManager.tsx`
2. Elimina el array `mockLocations` de `availability/page.tsx`
3. Actualiza el README eliminando la nota de "DATOS DE EJEMPLO"

## Troubleshooting

### Error: "Failed to fetch availability schedules"
- Verifica que el schema esté correctamente configurado en Sanity
- Verifica las credenciales de conexión a Sanity
- Revisa la consola del navegador para más detalles

### Los calendarios no se muestran
- Verifica que existan sedes (`location`) en Sanity
- Verifica que las referencias estén correctamente configuradas
- Revisa los permisos en las reglas de Sanity

### Error al guardar un calendario
- Verifica que todos los campos requeridos estén presentes
- Verifica el formato de las fechas y horas
- Revisa la consola para ver el error específico

## Notas Importantes

- Los servicios en `availabilityService.ts` ya están preparados para trabajar con Sanity
- No necesitas modificar los tipos TypeScript en `src/types/index.ts`
- Asegúrate de tener las dependencias de Sanity correctamente configuradas
- Considera hacer un backup antes de la migración si tienes datos de prueba importantes


