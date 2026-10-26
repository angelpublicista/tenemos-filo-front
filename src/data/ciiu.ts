/**
 * Codigos CIIU frecuentes en este sector.
 *
 * NO es el catalogo oficial: son sugerencias. La clasificacion completa es de
 * la DIAN, tiene cientos de codigos y cambia sin avisar, asi que el campo
 * admite cualquier codigo de cuatro digitos. Esta lista solo evita teclear a
 * ciegas a quien reconoce su actividad de un vistazo.
 *
 * La fuente de verdad es el RUT del anfitrion, casilla 46. De ahi se
 * prerrellena al subir el documento, y ahi se le remite cuando no lo sabe.
 *
 * Cada codigo de aqui se comprobo contra la CIIU Rev. 4 A.C. antes de
 * añadirlo. Los que no se pudieron confirmar se quedaron fuera a proposito:
 * una descripcion equivocada en un dato tributario es peor que no ofrecerla,
 * porque parece verificada.
 */

export const CIIU_SUGERIDOS = [
  { codigo: '5611', nombre: 'Expendio a la mesa de comidas preparadas' },
  { codigo: '5612', nombre: 'Expendio por autoservicio de comidas preparadas' },
  { codigo: '5613', nombre: 'Expendio de comidas preparadas en cafeterías' },
  { codigo: '5619', nombre: 'Otros tipos de expendio de comidas preparadas n.c.p.' },
  { codigo: '5621', nombre: 'Catering para eventos' },
  { codigo: '5630', nombre: 'Expendio de bebidas alcohólicas para consumo dentro del establecimiento' },
  { codigo: '5511', nombre: 'Alojamiento en hoteles' },
  { codigo: '5514', nombre: 'Alojamiento rural' },
  { codigo: '7912', nombre: 'Actividades de operadores turísticos' },
  { codigo: '8230', nombre: 'Organización de convenciones y eventos comerciales' },
  { codigo: '1102', nombre: 'Elaboración de bebidas fermentadas no destiladas' },
  { codigo: '1103', nombre: 'Producción de malta, elaboración de cervezas y otras bebidas malteadas' },
] as const;

/** Cuatro digitos. Lo que la DIAN imprime en la casilla 46 del RUT. */
export const CIIU_VALIDO = /^[0-9]{4}$/;

export function ciiuValido(valor?: string | null): boolean {
  return CIIU_VALIDO.test((valor ?? '').trim());
}

/**
 * Como se llama ese codigo, si esta entre los sugeridos.
 *
 * Devuelve null para los demas en vez de inventarse un nombre: el codigo es
 * valido igual, simplemente no sabemos describirlo.
 */
export function nombreDeCiiu(codigo?: string | null): string | null {
  const c = (codigo ?? '').trim();
  return CIIU_SUGERIDOS.find((x) => x.codigo === c)?.nombre ?? null;
}
