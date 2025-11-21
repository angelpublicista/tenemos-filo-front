# ✅ Flujo de Creación de Reservas Mejorado

## 🎯 Cambio Implementado

Se ha mejorado el flujo de creación manual de reservas para que sea similar al de cotizaciones, con búsqueda inteligente de experiencias disponibles.

---

## 🔄 Flujo Anterior vs Nuevo

### ❌ Flujo Anterior (2 pasos):
```
1. Detalles de la Reserva
   - Seleccionar de un dropdown de todas las experiencias
   - Ingresar fecha, hora, participantes
   - Seleccionar sede
   ↓
2. Información del Cliente
   - Datos del cliente
   - Crear reserva
```

**Problemas:**
- Mostraba todas las experiencias (incluso no disponibles)
- No verificaba capacidad antes de seleccionar
- Poca claridad sobre precios totales
- No filtraba por fecha/ubicación

### ✅ Flujo Nuevo (3 pasos):

```
PASO 0: Buscar Experiencia Disponible
   📅 Fecha del evento
   ⏰ Hora aproximada
   👥 Número de personas
   📍 Ciudad (opcional)
   🔍 [Buscar Experiencias]
   ↓
   📋 Resultados: Solo experiencias disponibles
   - Que acepten ese número de personas
   - Activas
   - Filtradas por ciudad si se especificó
   - Muestra precio total calculado
   ↓
   [Seleccionar UNA experiencia]
   ↓
PASO 1: Detalles de la Reserva
   ✅ Experiencia seleccionada (con opción de cambiar)
   ℹ️ Datos del evento (prellenados, con opción de cambiar)
   🏢 Sede
   ✨ Servicios adicionales (checkboxes)
   📝 Solicitudes especiales
   ↓
PASO 2: Información del Cliente
   👤 Tipo de cliente (Invitado/Registrado)
   📋 Datos del cliente
   💰 Resumen completo con desglose
   ↓
   [Crear Reserva] → Guarda en Sanity → Aparece en calendario
```

---

## ✨ Mejoras Implementadas

### 1. **Búsqueda Inteligente de Experiencias**

**Paso 0** permite ingresar criterios de búsqueda:
- Fecha del evento (con date picker visual)
- Hora aproximada
- Número de personas
- Ciudad (opcional)

**Resultados filtrados** automáticamente:
```groq
- status == "active"
- capacity >= número_personas
- minCapacity <= número_personas (si existe)
- ciudad matches (si se especificó)
```

### 2. **Vista Previa de Experiencias**

Cada experiencia en resultados muestra:
```
┌──────────────────────────────────────────┐
│ Clase de Cocina Italiana                 │
│ Aprende las bases de la cocina...        │
├──────────────────────────────────────────┤
│ ⏱️ 120 min  📍 Presencial  Cap: 4-12     │
│ 📍 Bogotá                                 │
├──────────────────────────────────────────┤
│ Precio por persona: $120,000 COP         │
│ Total (4 personas): $480,000 COP         │
├──────────────────────────────────────────┤
│  [Seleccionar esta Experiencia]          │
└──────────────────────────────────────────┘
```

### 3. **Datos Prellenados**

Al seleccionar una experiencia:
- ✅ Fecha, hora, participantes se copian automáticamente
- ✅ Ubicación se pre-selecciona si está disponible
- ✅ Campos mostrados como información (no editables directamente)
- ✅ Opción de "Cambiar" para volver al paso 0

### 4. **Navegación Mejorada**

**Botón "Anterior":**
- Paso 0: No se muestra
- Paso 1: Vuelve a búsqueda (paso 0)
- Paso 2: Vuelve a detalles (paso 1)

**Botón "Cambiar":**
- En experiencia seleccionada → Vuelve a resultados
- En datos del evento → Vuelve a formulario de búsqueda

### 5. **Validaciones Automáticas**

- ✅ Solo muestra experiencias con capacidad suficiente
- ✅ Solo experiencias activas
- ✅ Filtra por ubicación si se especifica
- ✅ Calcula precio total antes de seleccionar

---

## 📊 Ejemplo de Uso

### Escenario: Reserva para Evento Corporativo

**Paso 0 - Búsqueda:**
```
Fecha: miércoles, 20 de noviembre de 2025
Hora: 18:00
Personas: 15
Ciudad: Bogotá

[Buscar Experiencias Disponibles]

Resultados (3):
1. ✅ Clase de Cocina Italiana (10-20 personas) - $1,800,000
2. ✅ Taller de Mixología (8-25 personas) - $2,250,000
3. ✅ Degustación de Vinos (10-30 personas) - $3,000,000
```

**Selecciona:** Clase de Cocina Italiana

**Paso 1 - Detalles:**
```
Experiencia: Clase de Cocina Italiana [Cambiar]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Datos del Evento:
  Fecha: miércoles, 20 de noviembre de 2025
  Hora: 18:00
  Participantes: 15 personas
  [Cambiar datos del evento]

Sede: Sede Centro [Dropdown]

Servicios Adicionales:
☑️ Vino Premium (+$50,000 × 15) = +$750,000
☐ Chef Privado (+$200,000 total) = +$200,000
☑️ Certificado Digital (+$20,000 × 15) = +$300,000

Solicitudes Especiales:
[Sin gluten para 3 personas]

[Siguiente →]
```

**Paso 2 - Cliente:**
```
Tipo: ○ Invitado  ⦿ Registrado

Nombre: Juan Gómez
Email: juan@empresa.com
Teléfono: +57 300 123 4567

Resumen:
━━━━━━━━━━━━━━━━━━━━━━━
Experiencia: Clase de Cocina Italiana
Fecha: miércoles, 20 de noviembre de 2025 a las 18:00
Participantes: 15
Cliente: Juan Gómez

Subtotal (15 personas):   $1,800,000
+ Vino Premium (15x):       $750,000
+ Certificado (15x):        $300,000
━━━━━━━━━━━━━━━━━━━━━━━
Total:                    $2,850,000 COP

[Crear Reserva]
```

---

## 🎨 Diseño Visual

### Paso 0 - Cards de Resultados:
- Borde gris por defecto
- Hover → Borde naranja (#F26726)
- Click → Selecciona y avanza
- Precio total destacado en naranja
- Información completa visible

### Paso 1 - Experiencia Seleccionada:
- Fondo degradado naranja-rosa
- Borde destacado en naranja
- Botón "Cambiar" para volver
- Información del evento en caja azul

### Paso 2 - Resumen:
- Desglose completo de precios
- Addons listados individualmente
- Total en negrita naranja
- Formato profesional

---

## 🔧 Características Técnicas

### Reutilización de Código:
```typescript
import { searchExperiencesForQuote } from '@/lib/sanity/quoteService';
```
- Usa el mismo servicio de búsqueda que cotizaciones
- Misma lógica de filtrado
- Código DRY (Don't Repeat Yourself)

### Estados Agregados:
```typescript
const [searchData, setSearchData] = useState({
  date: '',
  time: '',
  guests: 1,
  location: '',
});
const [searchResults, setSearchResults] = useState<Experience[]>([]);
const [hasSearched, setHasSearched] = useState(false);
const [isSearching, setIsSearching] = useState(false);
```

### Flujo de Datos:
1. Usuario ingresa criterios → `searchData`
2. Búsqueda → `searchResults`
3. Selección → Datos se copian a campos de reserva
4. Continúa flujo normal

---

## ✅ Beneficios

### Para el Anfitrión:
- ✅ Solo ve experiencias realmente disponibles
- ✅ Ve precio total desde el inicio
- ✅ Menos errores al crear reservas
- ✅ Proceso más rápido y claro
- ✅ Puede comparar opciones antes de seleccionar

### Para el Sistema:
- ✅ Validación automática de capacidad
- ✅ Menos reservas inválidas
- ✅ Mejor UX = menos soporte necesario
- ✅ Datos más consistentes

### Para el Cliente Final:
- ✅ Reservas más precisas
- ✅ Menos cancelaciones por incompatibilidad
- ✅ Información correcta desde el inicio

---

## 📋 Validaciones Automáticas

**En la Búsqueda:**
- ✅ Solo experiencias activas
- ✅ Capacidad mínima ≤ participantes
- ✅ Capacidad máxima ≥ participantes
- ✅ Filtro por ciudad (si aplica)

**En la Selección:**
- ✅ Verifica disponibilidad de sede
- ✅ Muestra calendarios de disponibilidad
- ✅ Calcula precios incluyendo addons

---

## 🎯 Estado Actual

**Implementación:** ✅ Completa y funcional  
**Integración:** ✅ Con sistema de cotizaciones  
**Validaciones:** ✅ Automáticas  
**UX:** ✅ Mejorada significativamente  

**Pasos:**
- Paso 0: Búsqueda de experiencias ✅
- Paso 1: Detalles de reserva ✅
- Paso 2: Información del cliente ✅

---

## 🚀 Próximas Mejoras Sugeridas

1. **Filtros adicionales** en búsqueda:
   - Categoría de experiencia
   - Rango de precio
   - Duración

2. **Vista calendario** en búsqueda:
   - Ver disponibilidad de múltiples días
   - Seleccionar desde calendario visual

3. **Sugerencias inteligentes**:
   - "Clientes que vieron esto también reservaron..."
   - Experiencias similares

4. **Guardado de búsquedas**:
   - Repetir última búsqueda
   - Plantillas de búsqueda frecuente

---

¡El flujo de creación de reservas ahora es mucho más intuitivo y eficiente! 🎉








