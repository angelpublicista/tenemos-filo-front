# Tipos de TypeScript - Tenemos Filo

Este archivo centraliza todos los tipos de TypeScript utilizados en el proyecto.

## Estructura

### Formularios
- `RegisterFormData`: Datos básicos para registro (nombres, email, contraseña, términos)
- `RegisterHostFormData`: Extiende RegisterFormData agregando teléfono
- `LoginFormData`: Datos para inicio de sesión
- `HostStep1Data`: Datos personales del anfitrión (Paso 1)
- `HostStep2Data`: Datos de la empresa (Paso 2)
- `HostStep3Data`: Datos de la sede principal (Paso 3)

### Sanity CMS
- `CreateUserData`: Datos para crear usuario en Sanity
- `SanityUser`: Estructura completa de usuario en Sanity
- `Company`: Estructura completa de empresa en Sanity
- `Location`: Estructura completa de sede en Sanity

### Autenticación
- `AuthContextType`: Interfaz del contexto de autenticación (incluye login, logout, register, resetPassword)

### Componentes
- `ProtectedRouteProps`: Props para componente de ruta protegida

### Futuro (Eventos y Reservas)
- `Event`: Estructura de eventos
- `Reservation`: Estructura de reservas

## Uso

```typescript
import { RegisterFormData, CreateUserData, AuthContextType } from '@/types';

// En formularios
const { register, handleSubmit } = useForm<RegisterFormData>();

// En servicios
const createUser = async (userData: CreateUserData) => {
  // ...
};

// En contextos
const { user, login, logout, resetPassword } = useAuth();
```

## Rutas de Autenticación

- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/reset-password` - Página de recuperación de contraseña

## Agregar nuevos tipos

1. Define la interfaz en `src/types/index.ts`
2. Agrega comentarios descriptivos
3. Importa desde `@/types` en los archivos que lo necesiten
4. Actualiza esta documentación si es necesario 