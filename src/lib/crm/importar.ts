import { api } from '@/lib/api/client';
import type { FilaDeContacto } from '@/lib/crm/importar-hoja';

// La lectura de la hoja vive aparte: es logica pura y se comprueba sola.
export * from '@/lib/crm/importar-hoja';

/**
 * CRM-30. Importación de una base histórica de contactos.
 *
 * El archivo se lee en el navegador y al API viajan filas ya normalizadas: así
 * se puede enseñar una vista previa antes de tocar nada, y no hace falta
 * montar subida de archivos para algo que se usa una vez.
 */
/** Qué hacer con los contactos que ya existen. */
export type SiExiste = 'OMITIR' | 'COMPLETAR' | 'SOBRESCRIBIR';

export const QUE_HACER: Array<{ valor: SiExiste; etiqueta: string; detalle: string }> = [
  {
    valor: 'COMPLETAR',
    etiqueta: 'Completar lo que falte',
    detalle: 'Rellena los campos vacíos y no toca los que ya tienen algo.',
  },
  {
    valor: 'OMITIR',
    etiqueta: 'Dejarlos como están',
    detalle: 'Solo entra lo que no existía. Nada de lo que ya tienes cambia.',
  },
  {
    valor: 'SOBRESCRIBIR',
    etiqueta: 'Que mande el archivo',
    detalle: 'Reemplaza lo que ya tenías por lo que traiga el archivo. Una columna vacía no borra.',
  },
];

export interface ResumenDeImportacion {
  creados: number;
  actualizados: number;
  omitidos: number;
  repetidosEnElArchivo: number;
  sinFormaDeContacto: number;
  correosInvalidos: number;
  empresasCreadas: number;
  errores: Array<{ fila: number; motivo: string }>;
}

/**
 * Cómo se reconoce que un contacto ya existe.
 *
 * Se enseña antes de importar: fusionar dos fichas es difícil de deshacer, y
 * nadie debería descubrir la regla por lo que le pasó al archivo.
 */
export const COMO_SE_RECONOCE = [
  'Por el correo, si lo trae.',
  'Si no, por el teléfono, comparando solo los dígitos.',
  'Quien no traiga ninguno de los dos entra como contacto nuevo.',
];

/** El API acepta tandas, no archivos enteros. */
export const POR_TANDA = 500;

export const importarContactos = (contactos: FilaDeContacto[], siExiste: SiExiste) =>
  api.post<ResumenDeImportacion>('/contacts/importar', { contactos, siExiste });

