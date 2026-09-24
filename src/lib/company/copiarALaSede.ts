import type { Company } from '@/types';

/**
 * Que datos de la empresa se pueden copiar a una sede nueva.
 *
 * Vive aparte del modal para poder decirlo ANTES de pulsar. Enterarse al
 * pulsar de que no habia nada que copiar es enterarse tarde: el boton parece
 * roto cuando lo que falta es el dato en la empresa.
 *
 * El pais no entra: es Colombia siempre y ya no se elige.
 */

export interface DatosCopiables {
  valores: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    email?: string;
    phone?: string;
  };
  /** Nombres de lo que hay, para enseñarlo. */
  disponibles: string[];
  /**
   * Nombres de lo que falta. El codigo postal no se cuenta: casi nadie lo
   * tiene y listarlo como ausente solo hace ruido.
   */
  faltantes: string[];
  hayAlgo: boolean;
}

const ETIQUETAS = {
  street: 'dirección',
  city: 'ciudad',
  state: 'departamento',
  postalCode: 'código postal',
  email: 'email',
  phone: 'teléfono',
} as const;

type Clave = keyof typeof ETIQUETAS;

const conValor = (v?: string | null): string | undefined => {
  const s = v?.trim();
  return s ? s : undefined;
};

export function datosCopiables(empresa: Company | null): DatosCopiables {
  const valores = {
    street: conValor(empresa?.address?.street),
    city: conValor(empresa?.address?.city),
    state: conValor(empresa?.address?.state),
    postalCode: conValor(empresa?.address?.postalCode),
    email: conValor(empresa?.companyEmail),
    phone: conValor(empresa?.companyPhone),
  };

  const claves = Object.keys(ETIQUETAS) as Clave[];
  const disponibles = claves.filter((k) => valores[k]).map((k) => ETIQUETAS[k]);
  const faltantes = claves
    .filter((k) => !valores[k] && k !== 'postalCode')
    .map((k) => ETIQUETAS[k]);

  return { valores, disponibles, faltantes, hayAlgo: disponibles.length > 0 };
}

/** Lo mismo en una frase, para el resumen de despues de copiar. */
export function resumenDeCopia(d: DatosCopiables): string {
  return d.faltantes.length
    ? `Tu empresa no tiene ${d.faltantes.join(', ')}. Complétalo aquí o en la información de la empresa.`
    : '';
}
