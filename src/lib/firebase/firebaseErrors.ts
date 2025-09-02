// src/lib/firebase/firebaseErrors.ts

/**
 * Traduce los códigos de error de Firebase al español
 */
export const translateFirebaseError = (error: any): string => {
  // Si el error ya tiene un mensaje personalizado en español, usarlo
  if (error?.message && (
    error.message.includes('email') ||
    error.message.includes('documento') ||
    error.message.includes('Usuario no encontrado') ||
    error.message.includes('cuenta está pendiente') ||
    error.message.includes('Error de permisos') ||
    error.message.includes('Error de autenticación') ||
    error.message.includes('Error de configuración')
  )) {
    return error.message;
  }

  // Obtener el código de error de Firebase
  const errorCode = error?.code || error?.message || '';

  // Traducciones de errores comunes de Firebase Auth
  const firebaseErrorTranslations: { [key: string]: string } = {
    // Errores de autenticación - mensajes genéricos por seguridad
    'auth/user-not-found': 'Credenciales incorrectas. Verifica tu email y contraseña.',
    'auth/wrong-password': 'Credenciales incorrectas. Verifica tu email y contraseña.',
    'auth/invalid-email': 'El formato del correo electrónico no es válido.',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
    'auth/operation-not-allowed': 'Esta operación no está permitida.',
    
    // Errores de registro
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-password': 'La contraseña no es válida.',
    'auth/missing-password': 'Debes proporcionar una contraseña.',
    
    // Errores de red y servidor
    'auth/network-request-failed': 'Error de conexión. Verifica tu conexión a internet.',
    'auth/timeout': 'La operación ha expirado. Intenta de nuevo.',
    'auth/internal-error': 'Error interno del servidor. Intenta de nuevo más tarde.',
    'auth/service-unavailable': 'El servicio no está disponible temporalmente.',
    
    // Errores de token y sesión
    'auth/invalid-credential': 'Credenciales incorrectas. Verifica tu email y contraseña.',
    'auth/credential-already-in-use': 'Esta credencial ya está en uso por otra cuenta.',
    'auth/invalid-verification-code': 'El código de verificación no es válido.',
    'auth/invalid-verification-id': 'El ID de verificación no es válido.',
    'auth/expired-action-code': 'El código de acción ha expirado.',
    'auth/invalid-action-code': 'El código de acción no es válido.',
    
    // Errores de recuperación de contraseña
    'auth/invalid-continue-uri': 'La URL de continuación no es válida.',
    'auth/missing-continue-uri': 'Falta la URL de continuación.',
    'auth/missing-email': 'Debes proporcionar un correo electrónico.',
    
    // Errores de verificación
    'auth/email-already-verified': 'El correo electrónico ya ha sido verificado.',
    'auth/invalid-email-verified': 'El correo electrónico no ha sido verificado.',
    
    // Errores de proveedores
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con el mismo correo pero diferente método de inicio de sesión.',
    'auth/auth-domain-config-required': 'Error de configuración de autenticación.',
    'auth/cancelled-popup-request': 'Operación cancelada.',
    'auth/popup-blocked': 'La ventana emergente fue bloqueada por el navegador.',
    'auth/popup-closed-by-user': 'La ventana emergente fue cerrada por el usuario.',
    
    // Errores de usuario
    'auth/requires-recent-login': 'Esta operación requiere una autenticación reciente. Inicia sesión de nuevo.',
    'auth/user-token-expired': 'Tu sesión ha expirado. Inicia sesión de nuevo.',
    'auth/invalid-user-token': 'Token de usuario no válido.',
    'auth/user-mismatch': 'Las credenciales no corresponden al usuario actual.',
    
    // Errores específicos de la aplicación
    'auth/app-deleted': 'La aplicación ha sido eliminada.',
    'auth/app-not-authorized': 'La aplicación no está autorizada.',
    'auth/argument-error': 'Error en los argumentos proporcionados.',
    'auth/invalid-api-key': 'Clave API no válida.',
    'auth/invalid-user-import': 'Error al importar usuario.',
    'auth/maximum-user-count-exceeded': 'Se ha excedido el número máximo de usuarios.',
    'auth/missing-android-pkg-name': 'Falta el nombre del paquete Android.',
    'auth/missing-ios-bundle-id': 'Falta el ID del bundle iOS.',
    'auth/unauthorized-domain': 'Dominio no autorizado.',
    'auth/invalid-dynamic-link-domain': 'Dominio de enlace dinámico no válido.',
  };

  // Buscar traducción exacta por código
  if (firebaseErrorTranslations[errorCode]) {
    return firebaseErrorTranslations[errorCode];
  }

  // Buscar por coincidencias parciales en el mensaje
  const errorMessage = error?.message?.toLowerCase() || '';
  
  if (errorMessage.includes('email-already-in-use') || errorMessage.includes('email already in use')) {
    return 'Ya existe una cuenta con este correo electrónico.';
  }
  
  if (errorMessage.includes('weak-password') || errorMessage.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  
  if (errorMessage.includes('user-not-found') || errorMessage.includes('user not found')) {
    return 'Credenciales incorrectas. Verifica tu email y contraseña.';
  }
  
  if (errorMessage.includes('wrong-password') || errorMessage.includes('password is invalid')) {
    return 'Credenciales incorrectas. Verifica tu email y contraseña.';
  }
  
  if (errorMessage.includes('invalid-email') || errorMessage.includes('badly formatted')) {
    return 'El formato del correo electrónico no es válido.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  if (errorMessage.includes('too-many-requests')) {
    return 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
  }

  // Si no se encuentra una traducción específica, devolver un mensaje genérico
  return 'Ha ocurrido un error. Por favor, intenta de nuevo.';
};

/**
 * Extrae y traduce el error de Firebase de diferentes formatos
 */
export const getTranslatedFirebaseError = (error: unknown): string => {
  if (!error) {
    return 'Error desconocido';
  }

  // Si es un Error con mensaje
  if (error instanceof Error) {
    return translateFirebaseError(error);
  }

  // Si es un objeto con propiedades de error de Firebase
  if (typeof error === 'object' && error !== null) {
    return translateFirebaseError(error);
  }

  // Si es un string
  if (typeof error === 'string') {
    return translateFirebaseError({ message: error });
  }

  return 'Error desconocido';
};
