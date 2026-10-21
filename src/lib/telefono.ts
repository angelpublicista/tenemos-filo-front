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

/**
 * Lleva un teléfono a E.164 ("+573001234567"), que es lo que espera el campo.
 *
 * `PhoneInput` toma los primeros dígitos de un número SIN "+" como indicativo:
 * "3001234567" se lee como +30 (Grecia) y el resto como número. Todo teléfono
 * que no venga de ese campo —el del RUT, uno guardado antes de que existiera,
 * el que se copia de otro sitio— tiene que pasar por aquí antes de dárselo.
 *
 * Sin indicativo se asume Colombia, igual que el campo (`defaultCountry="co"`).
 * Devuelve cadena vacía si no hay dígitos, para no fabricar un "+57" suelto.
 */
export function aE164(valor?: string | null): string {
  const crudo = (valor ?? '').trim();
  const digitos = crudo.replace(/\D/g, '');
  if (!digitos) return '';

  // Ya trae "+", o "00" (la forma de marcar al exterior): el indicativo es suyo.
  if (crudo.startsWith('+')) return `+${digitos}`;
  if (digitos.startsWith('00')) return `+${digitos.slice(2)}`;

  // Colombia con el indicativo pero sin el "+": 57 + 10 dígitos.
  if (digitos.length === 12 && digitos.startsWith('57')) return `+${digitos}`;

  // Hasta 10 dígitos es un número nacional sin indicativo. Más largo, lo más
  // probable es que el indicativo venga incluido y solo falte el "+".
  return digitos.length <= 10 ? `+57${digitos}` : `+${digitos}`;
}
