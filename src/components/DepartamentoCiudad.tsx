"use client";

import React, { useMemo } from 'react';
import { Label, Select, TextInput } from 'flowbite-react';
import { COLOMBIA_DEPARTMENTS, getCitiesByDepartment } from '@/data/colombiaRegions';

interface DepartamentoCiudadProps {
  departamento: string;
  ciudad: string;
  onDepartamentoChange: (valor: string) => void;
  onCiudadChange: (valor: string) => void;
  /**
   * Codigo o nombre del pais. Fuera de Colombia no hay catalogo que ofrecer,
   * asi que se cae a texto libre en vez de enseñar departamentos que no
   * existen alli.
   */
  pais?: string;
  /** Los ids se conservan: hay formularios que leen su valor del DOM. */
  idDepartamento?: string;
  idCiudad?: string;
  requerido?: boolean;
  etiquetaDepartamento?: string;
  etiquetaCiudad?: string;
  errorDepartamento?: string;
  errorCiudad?: string;
  className?: string;
}

const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '').trim().toUpperCase();

/** Si el pais dado es Colombia, escrito como sea (CO, Colombia, COLOMBIA). */
export function esColombia(pais?: string): boolean {
  if (!pais || !pais.trim()) return true; // sin pais, se asume Colombia
  const p = sinTildes(pais);
  return p === 'CO' || p === 'COL' || p === 'COLOMBIA';
}

/**
 * Departamento y ciudad, con el catalogo de Colombia.
 *
 * Existe porque hasta ahora cada formulario lo resolvia a su manera: el alta de
 * empresa con desplegables del catalogo, y sedes, CRM y ajustes con texto
 * libre. Eso dejaba la misma ciudad escrita de cinco formas —"Bogota",
 * "BOGOTA", "Bogotá D.C."— y hacia imposible agrupar o filtrar por ella.
 *
 * Resuelve tres cosas que ya habian mordido por separado:
 *
 * 1. La ciudad depende del departamento. Asignar las dos a la vez fallaba
 *    cuando el valor se metia por fuera del render: llegaba antes de que
 *    existieran sus opciones y el select lo descartaba en silencio. Al ser
 *    controlado esto ya no puede pasar — opciones y valor salen del mismo
 *    render—, que es medio motivo para que este componente exista.
 * 2. Los datos que ya estan guardados traen texto libre que puede no estar en
 *    el catalogo. En vez de vaciarlo —que seria perder un dato sin avisar— se
 *    añade como opcion suelta.
 * 3. Fuera de Colombia no hay catalogo, asi que se cae a texto libre.
 */
export default function DepartamentoCiudad({
  departamento,
  ciudad,
  onDepartamentoChange,
  onCiudadChange,
  pais,
  idDepartamento = 'address-state',
  idCiudad = 'address-city',
  requerido = false,
  etiquetaDepartamento = 'Departamento',
  etiquetaCiudad = 'Ciudad',
  errorDepartamento,
  errorCiudad,
  className = '',
}: DepartamentoCiudadProps) {
  const conCatalogo = esColombia(pais);

  const ciudades = useMemo(
    () => (departamento ? getCitiesByDepartment(departamento) : []),
    [departamento],
  );

  const cambiarDepartamento = (valor: string) => {
    onDepartamentoChange(valor);
    // Cambiar de departamento invalida la ciudad: la que habia no pertenece al
    // nuevo. Se limpia salvo que si exista alli.
    const ciudadesNuevas = valor ? getCitiesByDepartment(valor) : [];
    if (ciudad && !ciudadesNuevas.includes(ciudad)) onCiudadChange('');
  };

  const marca = requerido ? <span className="text-red-500 ml-1">*</span> : null;

  if (!conCatalogo) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
        <div>
          <Label color="gray" className="mb-2 block">
            {etiquetaDepartamento}
            {marca}
          </Label>
          <TextInput
            id={idDepartamento}
            value={departamento}
            onChange={(e) => onDepartamentoChange(e.target.value)}
            placeholder="Estado o provincia"
            color={errorDepartamento ? 'failure' : 'white'}
          />
          {errorDepartamento && <p className="mt-1 text-sm text-red-600">{errorDepartamento}</p>}
        </div>
        <div>
          <Label color="gray" className="mb-2 block">
            {etiquetaCiudad}
            {marca}
          </Label>
          <TextInput
            id={idCiudad}
            value={ciudad}
            onChange={(e) => onCiudadChange(e.target.value)}
            placeholder="Ciudad"
            color={errorCiudad ? 'failure' : 'white'}
          />
          {errorCiudad && <p className="mt-1 text-sm text-red-600">{errorCiudad}</p>}
        </div>
      </div>
    );
  }

  const deptoFueraDeCatalogo =
    departamento && !COLOMBIA_DEPARTMENTS.some((d) => d.name === departamento);
  const ciudadFueraDeCatalogo = ciudad && !ciudades.includes(ciudad);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div>
        <Label color="gray" className="mb-2 block">
          {etiquetaDepartamento}
          {marca}
        </Label>
        <Select
          id={idDepartamento}
          value={departamento}
          onChange={(e) => cambiarDepartamento(e.target.value)}
          color={errorDepartamento ? 'failure' : 'white'}
        >
          <option value="">Selecciona un departamento</option>
          {COLOMBIA_DEPARTMENTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
          {/* Lo que ya estaba guardado y no esta en el catalogo: se conserva en
              vez de vaciarlo por la cara. */}
          {deptoFueraDeCatalogo && <option value={departamento}>{departamento}</option>}
        </Select>
        {errorDepartamento && <p className="mt-1 text-sm text-red-600">{errorDepartamento}</p>}
      </div>

      <div>
        <Label color="gray" className="mb-2 block">
          {etiquetaCiudad}
          {marca}
        </Label>
        <Select
          id={idCiudad}
          value={ciudad}
          disabled={!departamento}
          onChange={(e) => onCiudadChange(e.target.value)}
          color={errorCiudad ? 'failure' : 'white'}
        >
          <option value="">
            {departamento ? 'Selecciona una ciudad' : 'Selecciona primero un departamento'}
          </option>
          {ciudades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {ciudadFueraDeCatalogo && <option value={ciudad}>{ciudad}</option>}
        </Select>
        {errorCiudad && <p className="mt-1 text-sm text-red-600">{errorCiudad}</p>}
      </div>
    </div>
  );
}

/**
 * Para asignar departamento y ciudad de golpe desde fuera (por ejemplo, lo que
 * sale de leer un RUT).
 *
 * Devuelve la ciudad solo si pertenece a ese departamento; si no, null, para no
 * dejar puesta una ciudad que el desplegable no podria mostrar.
 */
export function ciudadValidaEn(departamento: string, ciudad: string): string | null {
  if (!departamento || !ciudad) return null;
  return getCitiesByDepartment(departamento).includes(ciudad) ? ciudad : null;
}
