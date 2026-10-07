/**
 * El dinero, escrito como se escribe en Colombia.
 *
 * Miles con punto y sin decimales: el peso no tiene centavos en la práctica, y
 * un «$ 150.000,00» en pantalla solo añade ruido. La moneda se dice siempre —
 * COP por ahora— porque un número suelto en una pantalla de precios se lee mal
 * en cuanto hay más de una moneda en la cabeza de quien mira.
 */

/** Lo que se enseña: «$ 150.000». Sin decimales, miles con punto. */
export function pesos(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

/** El número con separadores, sin el símbolo: «150.000». Para los inputs. */
export function conSeparadores(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valor);
}

/**
 * El número que hay detrás de lo que se tecleó.
 *
 * Se queda con los dígitos y tira todo lo demás: así da igual que alguien
 * pegue «$ 150.000», escriba los puntos a mano o no escriba ninguno.
 *
 * `null` cuando no queda ningún dígito, que es distinto de cero: un campo
 * vacío no es un precio de cero.
 */
export function soloElNumero(texto: string): number | null {
  const digitos = texto.replace(/[^\d]/g, '');
  if (digitos === '') return null;
  return Number(digitos);
}

/**
 * Formatea un input de dinero mientras se escribe.
 *
 * Para los campos que viven dentro de un SweetAlert, donde no hay React que
 * controle el valor. Se le pasa el input ya montado y él se encarga.
 *
 * Devuelve una función que lee el número, para no repetir el parseo en quien
 * lo llama.
 */
export function formatearMientrasEscribe(input: HTMLInputElement): () => number | null {
  const pintar = () => {
    const n = soloElNumero(input.value);
    input.value = n === null ? '' : conSeparadores(n);
  };
  input.addEventListener('input', pintar);
  pintar();
  return () => soloElNumero(input.value);
}
