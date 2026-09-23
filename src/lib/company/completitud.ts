import { Company } from '@/types';
import { pideCamaraDeComercio } from '@/lib/company/tipos';
import type { TipoDeContacto } from '@/lib/company/contactos';

/** Un contacto cuenta solo si tiene a quien escribir. */
const tieneContacto = (empresa: Company | null, tipo: TipoDeContacto) =>
  Boolean(empresa?.contacts?.some((c) => c.type === tipo && c.email?.trim()));

/**
 * Cuanto le falta a una empresa por rellenar.
 *
 * Vive aparte y no dentro de una pantalla porque lo preguntan dos: la ficha de
 * empresa y el formulario de alta. Tenerlo en un sitio evita que una diga
 * "completado" mientras la otra sigue pidiendo datos.
 *
 * El criterio de "obligatorio" es el mismo de los esquemas de CompanySetupForm:
 * sin esos campos el formulario no deja pasar de paso. Los demas no bloquean,
 * pero cuentan igual para el progreso — son los que hacen que el catalogo
 * publico se vea bien, que es de lo que se trata.
 */

export interface CampoEmpresa {
  /** Como se llama para quien lo lee, no en el modelo. */
  etiqueta: string;
  relleno: boolean;
  obligatorio: boolean;
  /** Paso del formulario donde se rellena, para poder llevar hasta el. */
  paso: 1 | 2 | 3 | 4;
}

export interface Completitud {
  campos: CampoEmpresa[];
  faltantes: CampoEmpresa[];
  /** Solo los que ademas bloquean: sin ellos la empresa esta a medias. */
  faltantesObligatorios: CampoEmpresa[];
  total: number;
  rellenos: number;
  porcentaje: number;
  completa: boolean;
}

const tiene = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
};

export function calcularCompletitud(empresa: Company | null): Completitud {
  const dir = empresa?.address;

  const campos: CampoEmpresa[] = [
    // ─── Paso 1: informacion basica ───
    { etiqueta: 'Nombre de la empresa', relleno: tiene(empresa?.companyName), obligatorio: true, paso: 1 },
    { etiqueta: 'Tipo de persona', relleno: tiene(empresa?.personType), obligatorio: true, paso: 1 },
    { etiqueta: 'Tipo de empresa', relleno: tiene(empresa?.companyType), obligatorio: true, paso: 1 },
    { etiqueta: 'Correo de contacto', relleno: tiene(empresa?.companyEmail), obligatorio: true, paso: 1 },
    { etiqueta: 'Teléfono', relleno: tiene(empresa?.companyPhone), obligatorio: true, paso: 1 },
    { etiqueta: 'Logo', relleno: tiene(empresa?.logo?.asset?._ref), obligatorio: false, paso: 1 },
    { etiqueta: 'Descripción', relleno: tiene(empresa?.description), obligatorio: false, paso: 1 },

    // ─── Paso 2: informacion fiscal y direccion ───
    { etiqueta: 'Tipo de documento', relleno: tiene(empresa?.documentType), obligatorio: true, paso: 2 },
    { etiqueta: 'Número de documento', relleno: tiene(empresa?.documentNumber), obligatorio: true, paso: 2 },
    { etiqueta: 'Razón social', relleno: tiene(empresa?.businessName), obligatorio: true, paso: 2 },
    { etiqueta: 'Actividad económica (CIIU)', relleno: tiene(empresa?.ciiuCode), obligatorio: false, paso: 2 },
    // Una persona natural firma por si misma: no tiene representante que
    // registrar, y contarlo le dejaria el perfil incompleto para siempre.
    ...(empresa?.personType === 'natural'
      ? []
      : [
          {
            etiqueta: 'Representante legal',
            relleno: tiene(empresa?.legalRepName),
            obligatorio: false,
            paso: 2 as const,
          },
        ]),
    { etiqueta: 'Dirección', relleno: tiene(dir?.street), obligatorio: true, paso: 2 },
    { etiqueta: 'Ciudad', relleno: tiene(dir?.city), obligatorio: true, paso: 2 },
    { etiqueta: 'Departamento', relleno: tiene(dir?.state), obligatorio: true, paso: 2 },
    { etiqueta: 'País', relleno: tiene(dir?.country), obligatorio: true, paso: 2 },
    { etiqueta: 'Sitio web', relleno: tiene(empresa?.website), obligatorio: false, paso: 2 },
    { etiqueta: 'Código postal', relleno: tiene(dir?.postalCode), obligatorio: false, paso: 2 },
    { etiqueta: 'RUT', relleno: tiene(empresa?.rutKey), obligatorio: false, paso: 2 },
    // A una persona natural no se le pide, asi que tampoco cuenta: dejarlo
    // seria enseñarle un perfil eternamente incompleto por un papel que no
    // puede conseguir.
    ...(pideCamaraDeComercio(empresa?.personType)
      ? [
          {
            etiqueta: 'Cámara de Comercio',
            relleno: tiene(empresa?.camaraKey),
            obligatorio: false,
            paso: 2 as const,
          },
        ]
      : []),

    // ─── Paso 3: contactos ───
    {
      etiqueta: 'Contacto de reservas',
      relleno: tieneContacto(empresa, 'reservas'),
      obligatorio: true,
      paso: 3,
    },
    {
      etiqueta: 'Contacto de contabilidad',
      relleno: tieneContacto(empresa, 'contabilidad'),
      obligatorio: true,
      paso: 3,
    },

    // ─── Paso 4: tamaño del negocio ───
    { etiqueta: 'Número de empleados', relleno: tiene(empresa?.employeeCount), obligatorio: true, paso: 4 },
    { etiqueta: 'Ingresos anuales', relleno: tiene(empresa?.annualRevenue), obligatorio: false, paso: 4 },
    { etiqueta: 'Años de operación', relleno: tiene(empresa?.businessYears), obligatorio: false, paso: 4 },
  ];

  const rellenos = campos.filter((c) => c.relleno).length;
  const faltantes = campos.filter((c) => !c.relleno);

  return {
    campos,
    faltantes,
    faltantesObligatorios: faltantes.filter((c) => c.obligatorio),
    total: campos.length,
    rellenos,
    // Se redondea hacia abajo para no cantar 100% con algo sin rellenar.
    porcentaje: campos.length ? Math.floor((rellenos / campos.length) * 100) : 0,
    completa: faltantes.length === 0,
  };
}
