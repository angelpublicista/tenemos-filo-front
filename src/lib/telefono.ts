/**
 * Utilidades de telefono, aparte del componente.
 *
 * Viven aqui y no dentro de TelefonoInput porque ese arrastra la hoja de
 * estilos de react-international-phone, y entonces no se pueden usar —ni
 * probar— fuera de un navegador.
 */

/**
 * Si un telefono tiene algo mas que el prefijo del pais.
 *
 * `PhoneInput` nunca devuelve cadena vacia: en cuanto se monta ya vale "+57".
 * Comprobar `!telefono` daria por bueno un campo en el que nadie escribio.
 */
export function telefonoVacio(valor?: string | null): boolean {
  const v = (valor ?? '').replace(/[^\d+]/g, '');
  // Solo el prefijo ("+57", "+1"...) cuenta como vacio.
  return v === '' || v === '+' || /^\+\d{1,4}$/.test(v);
}
