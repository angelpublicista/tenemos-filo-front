"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Label, Modal, ModalBody, ModalHeader, Textarea, TextInput } from 'flowbite-react';
import { HiOutlineGlobeAlt, HiOutlineDocumentText, HiOutlineUpload } from 'react-icons/hi';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { createExperienceInSanity, getExperiencesByCompany } from '@/lib/sanity/experienceService';
import type { CreateExperienceData, Location } from '@/types';
import { esHojaDeCalculo, leerLibro, libroATexto } from '@/lib/hojas-de-calculo';
import PrecioInput from '@/components/PrecioInput';
import {
  ETIQUETA_CONFIANZA,
  copiarImagen,
  leerDesdeArchivo,
  leerDesdeEnlace,
  leerDesdeTexto,
  normalizar,
  type ExperienciaLeida,
  type Fuente,
} from '@/lib/catalogo/importar';
import { pesos } from '@/lib/dinero';

type Via = 'texto' | 'enlace' | 'archivo';
type Paso = 'entrada' | 'leyendo' | 'revision';

/** Una candidata ya revisable: lo que leyó el asistente más lo que decide quien revisa. */
interface Candidata extends ExperienciaLeida {
  incluir: boolean;
  sedeId: string | null;
  portada: string | null;
  /** El título de la experiencia que ya existe y se le parece. */
  yaExiste: string | null;
}

type Categoria = CreateExperienceData['categories'][number];

const CATEGORIAS_VALIDAS: readonly Categoria[] = [
  'cooking', 'mixology', 'tasting', 'catering',
  'corporate', 'celebrations', 'workshops', 'other',
];

/** Se queda con lo que el modelo devolvió y encaja; si nada encaja, "other". */
function categoriasValidas(cs: string[]): Categoria[] {
  const buenas = cs.filter((c): c is Categoria =>
    (CATEGORIAS_VALIDAS as readonly string[]).includes(c),
  );
  return buenas.length > 0 ? buenas : ['other'];
}

const COLOR_CONFIANZA: Record<string, string> = {
  alta: 'bg-green-100 text-green-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-red-100 text-red-800',
};

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Para refrescar el listado cuando algo entró de verdad. */
  onImportado: () => void;
}

/**
 * El asistente que pasa el catálogo de un anfitrión a sus experiencias.
 *
 * Entre leer y crear hay siempre una persona. El asistente puede leer mal un
 * precio de una web, y una experiencia publicada con el precio equivocado es
 * dinero mal cobrado en cuanto alguien reserva. Por eso todo entra como
 * borrador y nada se publica solo.
 */
export default function ImportarCatalogo({ abierto, onCerrar, onImportado }: Props) {
  const { sanityUser } = useAuth();
  const { showError, showSuccess } = useSweetAlert();

  const [via, setVia] = useState<Via>('enlace');
  const [paso, setPaso] = useState<Paso>('entrada');
  const [texto, setTexto] = useState('');
  const [url, setUrl] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  const [candidatas, setCandidatas] = useState<Candidata[]>([]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fuente, setFuente] = useState<Fuente | null>(null);
  const [sedes, setSedes] = useState<Location[]>([]);
  const [titulosExistentes, setTitulosExistentes] = useState<Map<string, string>>(new Map());
  const [creando, setCreando] = useState(false);

  const companyId = sanityUser?.companyId;

  // Las sedes y lo que ya tiene se cargan al abrir: hacen falta para cruzar la
  // sede que menciona el catálogo y para avisar de las repetidas.
  useEffect(() => {
    if (!abierto || !companyId) return;
    void (async () => {
      try {
        const [ss, ee] = await Promise.all([
          getLocationsByCompany(companyId),
          getExperiencesByCompany(companyId),
        ]);
        setSedes(ss ?? []);
        setTitulosExistentes(new Map((ee ?? []).map((e) => [normalizar(e.title), e.title])));
      } catch {
        setSedes([]);
      }
    })();
  }, [abierto, companyId]);

  const limpiar = useCallback(() => {
    setPaso('entrada');
    setCandidatas([]);
    setImagenes([]);
    setFuente(null);
    setTexto('');
    setUrl('');
    setArchivo(null);
  }, []);

  const cerrar = () => {
    limpiar();
    onCerrar();
  };

  /** Cruza la sede que menciona el texto con las que el anfitrión ya tiene. */
  const sedeQueCuadra = useCallback(
    (mencion: string | null): string | null => {
      if (!mencion) return null;
      const m = normalizar(mencion);
      const exacta = sedes.find((s) => normalizar(s.name) === m);
      if (exacta) return exacta._id;
      // Una sede llamada "Usaquén" contra un texto que dice "sede Usaquén".
      const contenida = sedes.find(
        (s) => m.includes(normalizar(s.name)) || normalizar(s.name).includes(m),
      );
      return contenida?._id ?? null;
    },
    [sedes],
  );

  const leer = async () => {
    setPaso('leyendo');
    try {
      // Una hoja de cálculo se abre aquí y lo que viaja es su texto: el modelo
      // no lee .xlsx, y mandarla entera para convertirla en el servidor sería
      // el mismo trabajo más lejos. Además así se respeta la codificación de
      // un .csv, que es donde se tuercen los acentos.
      const esHoja = via === 'archivo' && !!archivo && esHojaDeCalculo(archivo.name);

      const r =
        via === 'enlace'
          ? await leerDesdeEnlace(url.trim())
          : esHoja
            ? await leerDesdeTexto(
                libroATexto(leerLibro(await (archivo as File).arrayBuffer(), (archivo as File).name)),
                `Catálogo en hoja de cálculo (${(archivo as File).name}). Las columnas separadas por tabuladores; la primera fila suele ser el encabezado.`,
              )
            : via === 'archivo'
              ? await leerDesdeArchivo(archivo as File)
              : await leerDesdeTexto(texto);

      if (r.experiencias.length === 0) {
        setPaso('entrada');
        showError(
          'No se encontraron experiencias',
          'El asistente no reconoció ninguna experiencia ahí. Prueba con la página donde las listas, o pega el texto directamente.',
        );
        return;
      }

      setCandidatas(
        r.experiencias.map((e) => ({
          ...e,
          incluir: true,
          sedeId: sedeQueCuadra(e.sedeMencionada),
          portada: e.imagenes[0] ?? null,
          yaExiste: titulosExistentes.get(normalizar(e.title)) ?? null,
        })),
      );
      setImagenes(r.imagenes);
      setFuente(r.fuente);
      setPaso('revision');
    } catch (err) {
      setPaso('entrada');
      showError('No se pudo leer', err instanceof Error ? err.message : undefined);
    }
  };

  const cambiar = (i: number, cambios: Partial<Candidata>) =>
    setCandidatas((c) => c.map((x, j) => (j === i ? { ...x, ...cambios } : x)));

  const elegidas = useMemo(() => candidatas.filter((c) => c.incluir), [candidatas]);

  const crear = async () => {
    if (!companyId || elegidas.length === 0) return;
    setCreando(true);

    let creadas = 0;
    const fallidas: string[] = [];

    for (const c of elegidas) {
      try {
        // La portada se copia a nuestro almacenamiento, no se enlaza: si su web
        // cambia o desaparece, su catálogo aquí se quedaría con huecos.
        let portada: string | undefined;
        if (c.portada) {
          try {
            portada = (await copiarImagen(c.portada)).publicUrl;
          } catch {
            // Una foto que no se deja copiar no vale perder la experiencia.
            portada = undefined;
          }
        }

        // Los valores por defecto son los del formulario de crear a mano: una
        // ficha a medias se puede completar, pero no se puede guardar sin
        // duración ni aforo.
        await createExperienceInSanity({
          title: c.title.trim(),
          company: companyId,
          description: c.description || '',
          categories: categoriasValidas(c.categories),
          duration: c.duration ?? 120,
          minCapacity: c.minCapacity ?? 1,
          basePrice: c.basePrice ?? 0,
          currency: 'COP',
          featuredImage: portada,
          locations: c.sedeId ? [c.sedeId] : [],
          requirements: c.requirements ? [c.requirements] : undefined,
          includes: c.includes.length > 0 ? c.includes : undefined,
          // Siempre borrador: lo publica el anfitrión cuando lo haya mirado.
          status: 'draft',
        });
        creadas += 1;
      } catch {
        fallidas.push(c.title);
      }
    }

    setCreando(false);

    if (creadas > 0) onImportado();
    if (fallidas.length === 0) {
      // Lo que falta se dice aquí y no se descubre después: una pieza recién
      // importada no tiene horario, y sin horario no tiene cupos ni se puede
      // reservar. Es el paso que de verdad queda.
      showSuccess(
        `${creadas} ${creadas === 1 ? 'experiencia creada' : 'experiencias creadas'}`,
        'Quedaron como borrador. En Publicaciones las pones en una sede y les das horario y cupos.',
      );
      cerrar();
    } else {
      showError(
        `Entraron ${creadas} de ${elegidas.length}`,
        `No se pudieron crear: ${fallidas.join(', ')}.`,
      );
    }
  };

  const puedeLeer =
    (via === 'texto' && texto.trim().length >= 40) ||
    (via === 'enlace' && url.trim().length > 8) ||
    (via === 'archivo' && !!archivo);

  return (
    <Modal show={abierto} onClose={cerrar} size="5xl">
      <ModalHeader>Importar mi catálogo</ModalHeader>
      <ModalBody>
        {paso === 'entrada' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Pásale tu catálogo y el asistente lo pasa a fichas de experiencia. Lo que
              saque <strong>entra como borrador</strong>: lo revisas y lo publicas tú.
            </p>

            <div className="flex flex-wrap gap-2">
              {([
                { v: 'enlace', icono: HiOutlineGlobeAlt, texto: 'Desde mi web' },
                { v: 'texto', icono: HiOutlineDocumentText, texto: 'Pegar texto' },
                { v: 'archivo', icono: HiOutlineUpload, texto: 'Subir un archivo' },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setVia(o.v)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                    via === o.v
                      ? 'border-marca bg-marca-tenue text-[#334C5D]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <o.icono className="h-4 w-4" />
                  {o.texto}
                </button>
              ))}
            </div>

            {via === 'enlace' && (
              <div>
                <Label htmlFor="cat-url">La página donde están tus experiencias</Label>
                <TextInput
                  id="cat-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mirestaurante.com/experiencias"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lee esa página y entra en las que enlace que parezcan experiencias, hasta
                  ocho. Si tu web carga el contenido con JavaScript puede no ver nada; en ese
                  caso pega el texto.
                </p>
              </div>
            )}

            {via === 'texto' && (
              <div>
                <Label htmlFor="cat-texto">El texto de tu catálogo</Label>
                <Textarea
                  id="cat-texto"
                  rows={10}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={'Pega aquí tu carta de experiencias, tal cual la tengas.\n\nNo hace falta que esté ordenada.'}
                />
              </div>
            )}

            {via === 'archivo' && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-10 text-center hover:border-marca hover:bg-gray-50">
                <HiOutlineUpload className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {archivo ? archivo.name : 'Elegir archivo'}
                </span>
                <span className="mt-1 text-xs text-gray-400">
                  PDF, Excel, CSV o una foto · máx. 15 MB
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/*,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button color="gray" onClick={cerrar}>Cancelar</Button>
              <Button color="primary" onClick={() => void leer()} disabled={!puedeLeer}>
                Leer mi catálogo
              </Button>
            </div>
          </div>
        )}

        {paso === 'leyendo' && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-marca" />
            <p className="font-medium text-gray-900">Leyendo tu catálogo…</p>
            <p className="mt-1 text-sm text-gray-500">
              {via === 'enlace'
                ? 'Abriendo tu web y las páginas que enlaza. Puede tardar un minuto.'
                : 'Puede tardar un minuto.'}
            </p>
          </div>
        )}

        {paso === 'revision' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-gray-600">
                {candidatas.length === 1
                  ? 'Encontró 1 experiencia.'
                  : `Encontró ${candidatas.length} experiencias.`}{' '}
                Revisa los precios antes de crearlas: es lo que más se lee mal.
              </p>
              {fuente?.paginas && fuente.paginas.length > 1 && (
                <p className="text-xs text-gray-400">
                  Leyó {fuente.paginas.length} páginas de tu web
                </p>
              )}
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {candidatas.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    c.incluir ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={c.incluir}
                      onChange={(e) => cambiar(i, { incluir: e.target.checked })}
                      className="mt-1.5 h-4 w-4"
                      aria-label={`Incluir ${c.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <TextInput
                        value={c.title}
                        onChange={(e) => cambiar(i, { title: e.target.value })}
                        sizing="sm"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR_CONFIANZA[c.confianza]}`}
                        >
                          {ETIQUETA_CONFIANZA[c.confianza]}
                        </span>
                        {c.yaExiste && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                            Ya tienes «{c.yaExiste}»
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <Label htmlFor={`p-${i}`} className="text-xs">Precio por persona</Label>
                      <PrecioInput
                        id={`p-${i}`}
                        value={c.basePrice}
                        placeholder="Sin precio"
                        onChange={(v) => cambiar(i, { basePrice: v })}
                      />
                      {c.basePrice ? (
                        <p className="mt-0.5 text-[11px] text-gray-400">{pesos(c.basePrice)}</p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor={`d-${i}`} className="text-xs">Duración (min)</Label>
                      <TextInput
                        id={`d-${i}`}
                        type="number"
                        sizing="sm"
                        value={c.duration ?? ''}
                        placeholder="120"
                        onChange={(e) =>
                          cambiar(i, {
                            duration: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    {/* Sin columna de capacidad: los cupos son del horario,
                        y se ponen por franja al programar la experiencia. */}
                    <div>
                      <Label htmlFor={`s-${i}`} className="text-xs">Sede</Label>
                      <select
                        id={`s-${i}`}
                        value={c.sedeId ?? ''}
                        onChange={(e) => cambiar(i, { sedeId: e.target.value || null })}
                        className="mt-1 block w-full rounded-lg border-gray-300 p-2 text-sm"
                      >
                        <option value="">Sin asignar</option>
                        {sedes.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                      {c.sedeMencionada && !c.sedeId && (
                        <p className="mt-0.5 text-[11px] text-amber-700">
                          Decía «{c.sedeMencionada}»
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label htmlFor={`desc-${i}`} className="text-xs">Descripción</Label>
                    <Textarea
                      id={`desc-${i}`}
                      rows={2}
                      value={c.description}
                      onChange={(e) => cambiar(i, { description: e.target.value })}
                    />
                  </div>

                  {c.dudas.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
                      {c.dudas.map((d, k) => <li key={k}>{d}</li>)}
                    </ul>
                  )}

                  {imagenes.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-gray-700">
                        Portada {c.portada ? '· elegida' : '· ninguna'}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {imagenes.slice(0, 12).map((src) => (
                          <button
                            key={src}
                            onClick={() => cambiar(i, { portada: c.portada === src ? null : src })}
                            className={`relative h-14 w-20 shrink-0 overflow-hidden rounded border-2 ${
                              c.portada === src ? 'border-marca' : 'border-transparent'
                            }`}
                            title={src}
                          >
                            {/* Imágenes de un dominio cualquiera: <img> y no
                                next/image, que exige declarar cada host. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {imagenes.length > 0 && (
              <p className="text-xs text-gray-500">
                Las imágenes que elijas se copian a tu catálogo en FILO. Asegúrate de tener
                los derechos de las fotos que importes.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <Button color="gray" onClick={limpiar} disabled={creando}>
                Empezar de nuevo
              </Button>
              <Button color="primary" onClick={() => void crear()} disabled={creando || elegidas.length === 0}>
                {creando
                  ? 'Creando…'
                  : `Crear ${elegidas.length} ${elegidas.length === 1 ? 'borrador' : 'borradores'}`}
              </Button>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
