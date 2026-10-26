"use client";

import React, { useState } from 'react';
import { Button, Modal, ModalBody, ModalHeader, Select } from 'flowbite-react';
import { HiUpload } from 'react-icons/hi';
import * as XLSX from 'xlsx';
import { leerLibro } from '@/lib/hojas-de-calculo';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  CAMPOS,
  COMO_SE_RECONOCE,
  POR_TANDA,
  QUE_HACER,
  aContactos,
  adivinarColumnas,
  importarContactos,
  type Campo,
  type ResumenDeImportacion,
  type SiExiste,
} from '@/lib/crm/importar';

interface Props {
  /** Para recargar el listado cuando algo entró de verdad. */
  onImportado: () => void;
}

/** Cuántas filas se enseñan antes de importar. Suficiente para reconocer la hoja. */
const FILAS_DE_MUESTRA = 5;

/**
 * "1 fila" y "3 filas", no "1 filas".
 *
 * El resumen habla de lo que acaba de pasar con el archivo de alguien; leer
 * "1 filas venían repetidas" hace dudar de quién hizo las cuentas.
 */
const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/**
 * CRM-30. Traer una base histórica de contactos desde Excel o CSV.
 *
 * El archivo se lee aquí, en el navegador, y lo que viaja al API son filas ya
 * mapeadas. Eso permite enseñar antes qué va a entrar y en qué columna va cada
 * cosa, que es lo que evita descubrir el desastre cuando ya está hecho.
 */
export default function ImportarContactos({ onImportado }: Props) {
  const { showError } = useSweetAlert();
  const [abierto, setAbierto] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filas, setFilas] = useState<string[][]>([]);
  const [mapa, setMapa] = useState<Record<number, Campo | ''>>({});
  const [siExiste, setSiExiste] = useState<SiExiste>('COMPLETAR');
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resumen, setResumen] = useState<ResumenDeImportacion | null>(null);

  const limpiar = () => {
    setNombreArchivo('');
    setEncabezados([]);
    setFilas([]);
    setMapa({});
    setResumen(null);
    setProgreso(0);
  };

  const cerrar = () => {
    setAbierto(false);
    limpiar();
  };

  const leerArchivo = async (archivo: File) => {
    try {
      const libro = leerLibro(await archivo.arrayBuffer(), archivo.name);
      const hoja = libro.Sheets[libro.SheetNames[0]];
      if (!hoja) throw new Error('El archivo no tiene ninguna hoja');

      // `header: 1` devuelve filas como arrays, sin inventar nombres de
      // columna: el encabezado real es la primera fila y es lo que hay que
      // enseñar para mapear.
      const todo = XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1, raw: false, defval: '' });
      const [cabecera, ...resto] = todo;
      if (!cabecera?.length) throw new Error('La primera fila debería tener los nombres de las columnas');

      const limpias = cabecera.map((c) => String(c ?? '').trim());
      setNombreArchivo(archivo.name);
      setEncabezados(limpias);
      setFilas(resto.filter((f) => f.some((v) => String(v ?? '').trim())));
      setMapa(adivinarColumnas(limpias));
      setResumen(null);
    } catch (err) {
      showError('No se pudo leer el archivo', err instanceof Error ? err.message : undefined);
    }
  };

  const contactos = aContactos(filas, mapa);
  const hayNombre = Object.values(mapa).includes('firstName');

  const importar = async () => {
    setImportando(true);
    setProgreso(0);
    // Se acumulan los resúmenes de cada tanda: al usuario le importa el total
    // del archivo, no en cuántos trozos se mandó.
    const total: ResumenDeImportacion = {
      creados: 0, actualizados: 0, omitidos: 0, repetidosEnElArchivo: 0,
      sinFormaDeContacto: 0, correosInvalidos: 0, empresasCreadas: 0,
      errores: [],
    };
    try {
      for (let i = 0; i < contactos.length; i += POR_TANDA) {
        const r = await importarContactos(contactos.slice(i, i + POR_TANDA), siExiste);
        total.creados += r.creados;
        total.actualizados += r.actualizados;
        total.omitidos += r.omitidos;
        total.repetidosEnElArchivo += r.repetidosEnElArchivo;
        total.sinFormaDeContacto += r.sinFormaDeContacto;
        total.correosInvalidos += r.correosInvalidos;
        total.empresasCreadas += r.empresasCreadas;
        // La fila que reporta el API es la de su tanda: se corrige para que
        // apunte a la del archivo, que es la que la persona tiene delante.
        total.errores.push(...r.errores.map((e) => ({ ...e, fila: e.fila + i })));
        setProgreso(Math.min(i + POR_TANDA, contactos.length));
      }
      setResumen(total);
      if (total.creados || total.actualizados) onImportado();
    } catch (err) {
      showError('Se interrumpió la importación', err instanceof Error ? err.message : undefined);
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      <Button color="gray" onClick={() => setAbierto(true)}>
        <HiUpload className="mr-2 h-4 w-4" />
        Importar
      </Button>

      <Modal show={abierto} onClose={cerrar} size="5xl" dismissible>
        <ModalHeader>Importar contactos</ModalHeader>
        <ModalBody>
          {resumen ? (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-gray-900">Listo</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>
                  <strong>{resumen.creados}</strong>{' '}
                  {resumen.creados === 1 ? 'contacto nuevo' : 'contactos nuevos'}
                </li>
                <li>
                  <strong>{resumen.actualizados}</strong>{' '}
                  {resumen.actualizados === 1 ? 'actualizado' : 'actualizados'}
                </li>
                {resumen.omitidos > 0 && (
                  <li>
                    {plural(resumen.omitidos, 'se dejó', 'se dejaron')} como{' '}
                    {resumen.omitidos === 1 ? 'estaba' : 'estaban'}
                  </li>
                )}
                {resumen.empresasCreadas > 0 && (
                  <li>
                    {plural(resumen.empresasCreadas, 'empresa nueva', 'empresas nuevas')} en tu CRM
                  </li>
                )}
              </ul>

              {(resumen.repetidosEnElArchivo > 0 ||
                resumen.sinFormaDeContacto > 0 ||
                resumen.correosInvalidos > 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-medium">Cosas que conviene que sepas</p>
                  <ul className="mt-1 space-y-0.5">
                    {resumen.repetidosEnElArchivo > 0 && (
                      <li>
                        {plural(resumen.repetidosEnElArchivo, 'fila venía repetida', 'filas venían repetidas')}{' '}
                        dentro del archivo y {resumen.repetidosEnElArchivo === 1 ? 'entró' : 'entraron'} una
                        sola vez.
                      </li>
                    )}
                    {resumen.correosInvalidos > 0 && (
                      <li>
                        {plural(resumen.correosInvalidos, 'correo estaba', 'correos estaban')} mal
                        {resumen.correosInvalidos === 1 ? ' escrito' : ' escritos'}: el contacto entró
                        sin correo.
                      </li>
                    )}
                    {resumen.sinFormaDeContacto > 0 && (
                      <li>
                        {plural(resumen.sinFormaDeContacto, 'entró', 'entraron')} sin correo ni
                        teléfono. No vas a poder escribirles hasta que los completes.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {resumen.errores.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-medium">
                    {plural(resumen.errores.length, 'fila no entró', 'filas no entraron')}
                  </p>
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                    {resumen.errores.slice(0, 50).map((e) => (
                      <li key={e.fila}>Fila {e.fila}: {e.motivo}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button color="primary" onClick={cerrar}>Cerrar</Button>
                <Button color="gray" onClick={limpiar}>Importar otro archivo</Button>
              </div>
            </div>
          ) : encabezados.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Sube tu base en Excel (.xlsx) o CSV. La primera fila tiene que ser la de los
                nombres de las columnas; del resto nos encargamos nosotros.
              </p>
              <p className="text-sm text-gray-500">
                No hace falta que esté completa: con el nombre basta para que un contacto entre.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-10 text-center hover:border-marca hover:bg-gray-50">
                <HiUpload className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Elegir archivo</span>
                <span className="mt-1 text-xs text-gray-400">.xlsx, .xls o .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void leerArchivo(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                <strong>{nombreArchivo}</strong> · {filas.length} filas
              </p>

              {/* Mapeo: una columna del archivo por fila, con a qué campo va.
                  Se adivina por el encabezado y se corrige aquí. */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">¿Qué es cada columna?</p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Columna del archivo</th>
                        <th className="px-3 py-2">Ejemplo</th>
                        <th className="px-3 py-2">Va a</th>
                      </tr>
                    </thead>
                    <tbody>
                      {encabezados.map((h, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-900">{h || `Columna ${i + 1}`}</td>
                          <td className="max-w-[16rem] truncate px-3 py-2 text-gray-500">
                            {filas.slice(0, FILAS_DE_MUESTRA).map((f) => f[i]).find((v) => String(v ?? '').trim()) ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              sizing="sm"
                              value={mapa[i] ?? ''}
                              onChange={(e) =>
                                setMapa((m) => ({ ...m, [i]: e.target.value as Campo | '' }))
                              }
                            >
                              <option value="">No importar</option>
                              {CAMPOS.map((c) => (
                                <option key={c.campo} value={c.campo}>
                                  {c.etiqueta}
                                  {c.obligatorio ? ' *' : ''}
                                </option>
                              ))}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!hayNombre && (
                  <p className="mt-2 text-sm text-red-600">
                    Falta decir cuál columna es el nombre. Sin eso no se puede importar nada.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  Si el contacto ya existe en tu CRM
                </p>
                <div className="space-y-2">
                  {QUE_HACER.map((o) => (
                    <label
                      key={o.valor}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                        siExiste === o.valor ? 'border-marca bg-marca-tenue' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="si-existe"
                        checked={siExiste === o.valor}
                        onChange={() => setSiExiste(o.valor)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{o.etiqueta}</span>
                        <span className="block text-xs text-gray-500">{o.detalle}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {/* La regla se dice ANTES: fusionar dos fichas cuesta
                    deshacerlo, y nadie deberia enterarse de como se reconoce
                    un contacto por lo que le paso a su archivo. */}
                <div className="mt-2 text-xs text-gray-500">
                  <p>Para saber si ya existe se mira, en este orden:</p>
                  <ul className="ml-4 list-disc">
                    {COMO_SE_RECONOCE.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  color="primary"
                  onClick={() => void importar()}
                  disabled={importando || !hayNombre || contactos.length === 0}
                >
                  {importando
                    ? `Importando ${progreso} de ${contactos.length}…`
                    : `Importar ${contactos.length} contactos`}
                </Button>
                <Button color="gray" onClick={limpiar} disabled={importando}>
                  Elegir otro archivo
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </>
  );
}
