import * as XLSX from 'xlsx';

/**
 * Abre una hoja de cálculo respetando sus acentos.
 *
 * Un .xlsx trae su codificación dentro y se lee tal cual. Un .csv no: son
 * bytes sueltos, y si no se dice nada la librería los interpreta como latin-1
 * y "María" llega como "MarÃ­a". Se intenta UTF-8 en estricto —lo que exporta
 * casi todo hoy— y si los bytes no son UTF-8 válido se cae a windows-1252,
 * que es lo que sigue produciendo Excel en español.
 *
 * Vive aquí y no dentro de una pantalla porque lo usan dos: la importación de
 * contactos y el asistente de catálogo. Un fallo de codificación arreglado en
 * un sitio tendría que arreglarse otra vez en el otro.
 */
export function leerLibro(bytes: ArrayBuffer, nombre: string): XLSX.WorkBook {
  if (!/\.csv$/i.test(nombre)) return XLSX.read(bytes, { type: 'array' });
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder('windows-1252').decode(bytes);
  }
  return XLSX.read(texto, { type: 'string' });
}

/** Si el nombre del archivo es de una hoja de cálculo. */
export const esHojaDeCalculo = (nombre: string) => /\.(xlsx|xls|csv)$/i.test(nombre);

/**
 * Pasa un libro entero a texto para dárselo a un modelo.
 *
 * Se conserva la rejilla —filas y columnas separadas por tabuladores— en vez
 * de aplanarlo a prosa: en un catálogo en hoja de cálculo, qué precio va con
 * qué experiencia lo dice la columna, y perdida la rejilla se pierde eso.
 * Cada hoja va con su nombre delante porque muchos anfitriones reparten el
 * catálogo en una hoja por tipo de experiencia.
 */
export function libroATexto(libro: XLSX.WorkBook, maxCaracteres = 100_000): string {
  const trozos: string[] = [];

  for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];
    if (!hoja) continue;
    const filas = XLSX.utils.sheet_to_csv(hoja, { FS: '\t', blankrows: false }).trim();
    if (filas.length === 0) continue;
    trozos.push(`## Hoja: ${nombre}\n${filas}`);
  }

  return trozos.join('\n\n').slice(0, maxCaracteres);
}
