/**
 * Los idiomas en que puede darse una experiencia.
 *
 * El anfitrión declara en cuáles la da; el comensal elige uno de esos al
 * reservar. No es la traducción de la aplicación: es un dato del servicio,
 * como la duración o el precio.
 *
 * Lista cerrada en códigos ISO 639-1, igual que en el API. Con texto libre,
 * "Inglés", "ingles" e "ING" serían tres idiomas distintos y el catálogo no
 * se podría filtrar por ninguno.
 */

export const IDIOMAS: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  pt: 'Portugués',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
};

export const CODIGOS_DE_IDIOMA = Object.keys(IDIOMAS);

/** El nombre del idioma, o el código tal cual si no lo conocemos. */
export function nombreDeIdioma(codigo: string): string {
  return IDIOMAS[codigo] ?? codigo;
}

/** «Español e inglés», para enseñarlo de corrido. */
export function listaDeIdiomas(codigos: string[]): string {
  const nombres = codigos.map(nombreDeIdioma);
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
