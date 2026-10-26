import { COLOMBIA_DEPARTMENTS, getCitiesByDepartment } from '@/data/colombiaRegions';

/**
 * Traduce lo que la IA saca de un RUT o de una Camara de Comercio a los campos
 * del formulario de empresa.
 *
 * Vive aparte del componente porque la parte delicada no es pintar nada, sino
 * casar los nombres: la DIAN escribe "BOGOTA D.C." y el formulario ofrece
 * "Bogotá D.C." en un desplegable. Sin normalizar, el departamento llega, no
 * casa con ninguna opcion y el select se queda vacio — que desde fuera parece
 * que la IA no leyo nada.
 */

export interface DatosExtraidos {
  nit?: string | null;
  digitoVerificacion?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  matriculaMercantil?: string | null;
  representanteLegal?: string | null;
  documentoRepresentante?: string | null;
  direccion?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  correo?: string | null;
  telefono?: string | null;
  esPersonaJuridica?: boolean | null;
  codigoCiiu?: string | null;
}

/** Un campo listo para aplicar, con su nombre en cristiano para el resumen. */
export interface CampoDetectado {
  campo: string;
  etiqueta: string;
  valor: string;
}

const limpiar = (v?: string | null): string => (typeof v === 'string' ? v.trim() : '');

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/** El departamento del catalogo que corresponde a lo que diga el documento. */
export function normalizarDepartamento(valor?: string | null): string | null {
  const v = limpiar(valor);
  if (!v) return null;
  const buscado = sinTildes(v);
  const exacto = COLOMBIA_DEPARTMENTS.find((d) => sinTildes(d.name) === buscado);
  if (exacto) return exacto.name;
  // "BOGOTA" a secas es lo normal en un RUT; el catalogo lo llama "Bogotá D.C."
  const parcial = COLOMBIA_DEPARTMENTS.find(
    (d) => sinTildes(d.name).startsWith(buscado) || buscado.startsWith(sinTildes(d.name)),
  );
  return parcial?.name ?? null;
}

/** La ciudad dentro de ese departamento, si es que existe alli. */
export function normalizarCiudad(departamento: string | null, valor?: string | null): string | null {
  const v = limpiar(valor);
  if (!v || !departamento) return null;
  const buscado = sinTildes(v);
  const ciudades = getCitiesByDepartment(departamento);
  return ciudades.find((c) => sinTildes(c) === buscado) ?? null;
}

/** Solo digitos: la DIAN imprime el NIT con puntos. */
export const soloDigitos = (v?: string | null): string => limpiar(v).replace(/\D/g, '');

/**
 * El NIT sin el digito de verificacion.
 *
 * Al modelo se le pide que no lo incluya, pero a veces lo hace igual, y
 * quitar los separadores a ciegas lo convertiria en una cifra mas del numero:
 * "900.123.456-7" acabaria guardado como 9001234567. Se corta por el guion
 * antes de limpiar.
 */
export function nitSinVerificacion(v?: string | null): string {
  const bruto = limpiar(v);
  if (!bruto) return '';
  const [parteNit] = bruto.split('-');
  return soloDigitos(parteNit);
}

/**
 * Qué se puede aplicar al formulario, con etiquetas para poder enseñarlo antes
 * de tocar nada.
 *
 * Se devuelve una lista y no un objeto porque antes de aplicar hay que
 * enseñarle a la persona que se detecto: son siete campos de golpe y algunos
 * pueden pisar lo que ya escribio.
 */
export function camposDesdeDocumento(datos: DatosExtraidos): CampoDetectado[] {
  const campos: CampoDetectado[] = [];
  const añadir = (campo: string, etiqueta: string, valor: string) => {
    if (valor) campos.push({ campo, etiqueta, valor });
  };

  const nit = nitSinVerificacion(datos.nit);
  if (nit) {
    añadir('documentNumber', 'Número de documento', nit);
    // Tener un RUT es tener un NIT, tambien siendo persona natural: la casilla
    // 5 del formulario se llama NIT para todo el que este inscrito, y la 6 es
    // su digito de verificacion.
    //
    // Antes esto solo se aplicaba a las personas juridicas, y como el digito
    // de verificacion solo se enseña cuando el tipo es NIT, una persona
    // natural subia su RUT y no veia ningun digito por ningun lado.
    añadir('documentType', 'Tipo de documento', 'nit');
  }

  añadir('businessName', 'Razón social', limpiar(datos.razonSocial));
  añadir('address.street', 'Dirección', limpiar(datos.direccion));

  const depto = normalizarDepartamento(datos.departamento);
  if (depto) {
    añadir('address.state', 'Departamento', depto);
    const ciudad = normalizarCiudad(depto, datos.ciudad);
    if (ciudad) añadir('address.city', 'Ciudad', ciudad);
  }

  añadir('companyEmail', 'Correo de contacto', limpiar(datos.correo));

  // El modelo a veces devuelve el codigo con su descripcion pegada
  // ("5611 - Expendio a la mesa..."). Se queda solo el numero, que es lo que
  // se guarda; y si no salen cuatro digitos limpios no se aplica nada, porque
  // un codigo tributario a medias es peor que ninguno.
  const ciiu = (limpiar(datos.codigoCiiu).match(/\b\d{4}\b/) ?? [])[0];
  if (ciiu) añadir('ciiuCode', 'Actividad económica (CIIU)', ciiu);

  // Representante legal. Sale del certificado de Camara de Comercio, que es
  // donde consta quien firma por la empresa; el RUT no lo trae.
  añadir('legalRepName', 'Representante legal', limpiar(datos.representanteLegal));
  const docRepresentante = soloDigitos(limpiar(datos.documentoRepresentante));
  if (docRepresentante) {
    añadir('legalRepDocNumber', 'Documento del representante', docRepresentante);
    // El certificado identifica al representante por cedula salvo rarezas; se
    // deja puesta y quien tenga pasaporte la cambia.
    añadir('legalRepDocType', 'Tipo de documento del representante', 'cedula');
  }

  return campos;
}

/** El telefono va aparte: no esta en react-hook-form, es un estado suelto. */
export const telefonoDesdeDocumento = (datos: DatosExtraidos): string => limpiar(datos.telefono);

/** El nombre comercial sirve de nombre de empresa cuando aun no hay ninguno. */
export const nombreDesdeDocumento = (datos: DatosExtraidos): string =>
  limpiar(datos.nombreComercial) || limpiar(datos.razonSocial);
