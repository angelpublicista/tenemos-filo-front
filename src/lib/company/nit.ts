/**
 * Digito de verificacion del NIT, segun la Orden Administrativa 4 de 1989 de
 * la DIAN.
 *
 * No hace falta que nadie lo escriba: se deduce del propio NIT. Y por eso
 * mismo sirve de comprobacion — si el que trae el RUT no coincide con el
 * calculado, es que el numero se leyo o se tecleo mal.
 */

/** Pesos que asigna la DIAN, de derecha a izquierda. */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * El DV de un NIT, o null si el numero no puede tener uno.
 *
 * Devuelve string y no number porque es un digito que se muestra, no una
 * cantidad con la que se opere.
 */
export function digitoVerificacion(nit: string): string | null {
  const digitos = (nit ?? '').replace(/\D/g, '');
  if (!digitos || digitos.length > PESOS.length) return null;

  // De derecha a izquierda, cada cifra por su peso.
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    const cifra = Number(digitos[digitos.length - 1 - i]);
    suma += cifra * PESOS[i];
  }

  const resto = suma % 11;
  // 0 y 1 se quedan tal cual; el resto se complementa a 11.
  return String(resto < 2 ? resto : 11 - resto);
}

/**
 * Si el DV que viene de fuera cuadra con el que sale del NIT.
 *
 * Cuando no cuadra, lo mas probable es que el NIT este mal: el DV es una sola
 * cifra y el NIT son nueve, asi que hay mas sitio donde equivocarse.
 */
export function dvCoincide(nit: string, dv?: string | null): boolean | null {
  const esperado = digitoVerificacion(nit);
  const dado = (dv ?? '').replace(/\D/g, '');
  if (!esperado || !dado) return null;
  return esperado === dado;
}
