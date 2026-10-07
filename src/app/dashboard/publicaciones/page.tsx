"use client";

/**
 * Publicaciones: las experiencias puestas en uso.
 *
 * Separado de «Mis experiencias» a propósito. Allí se CREA la pieza —qué se
 * hace, cuánto dura, qué incluye, qué fotos tiene—; aquí se USA: la misma
 * pieza puede publicarse en el local del centro como abierta, con cupos
 * sueltos los sábados, y en la finca como privada, por encargo y a otro
 * precio.
 *
 * Cada fila es una publicación: una experiencia en un escenario. Es la unidad
 * con la que se arma el catálogo público, y es lo que el comensal acaba
 * viendo.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from 'flowbite-react';
import {
  AiOutlineClockCircle,
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlinePauseCircle,
  AiOutlinePlayCircle,
  AiOutlinePlus,
} from 'react-icons/ai';
import { BiMap } from 'react-icons/bi';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AvailabilityManager from '@/components/AvailabilityManager';
import Loader from '@/components/Loader';
import PublicarModal, { type PiezaPublicable } from '@/components/Catalogo/PublicarModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  getPublicaciones,
  publicar,
  pausar,
  quitarPublicacion,
  type CondicionesDePublicacion,
  type Publicacion,
} from '@/lib/api/catalogo';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getExperiencesByCompany } from '@/lib/sanity/experienceService';
import type { Location } from '@/types';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Lo que esta publicación cambia respecto a la pieza. Solo eso.
 *
 * Se lee de `propias` y no de `condiciones`: estas últimas son las que acaban
 * rigiendo —con lo heredado ya resuelto— y enseñarlas aquí haría parecer que
 * cada sede declara un precio y un aforo que en realidad vienen de la pieza.
 */
function queCambia(p: Publicacion): string[] {
  const c = p.propias;
  if (!c) return [];
  return [
    c.kind === 'PRIVADA' ? 'Privada: el sitio completo' : '',
    c.kind === 'ABIERTA' ? 'Abierta: cupos sueltos' : '',
    c.basePrice !== null ? `${pesos(Number(c.basePrice))} por persona` : '',
    c.minimumNotice ? `${c.minimumNotice} h de anticipación` : '',
  ].filter(Boolean);
}

export default function PublicacionesPage() {
  const { sanityUser } = useAuth();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [piezas, setPiezas] = useState<PiezaPublicable[]>([]);
  const [sedes, setSedes] = useState<Location[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [editando, setEditando] = useState<Publicacion | null>(null);
  const [horarioDe, setHorarioDe] = useState<Publicacion | null>(null);

  const companyId = sanityUser?.companyId;

  const cargar = useCallback(async () => {
    if (!companyId) return;
    try {
      const [filas, exps, locs] = await Promise.all([
        getPublicaciones(),
        getExperiencesByCompany(companyId),
        getLocationsByCompany(companyId),
      ]);
      setPublicaciones(filas);
      setPiezas(
        (exps ?? [])
          // A domicilio no se publica en una sede: se va donde diga quien
          // reserva, así que no hay escenario que elegir.
          .filter((e) => e.atHome !== true)
          .map((e) => ({
            id: e._id,
            title: e.title,
            minCapacity: e.minCapacity ?? null,
            basePrice: e.basePrice ?? null,
            minimumNotice: e.minimumNotice ?? null,
          })),
      );
      setSedes(locs ?? []);
    } catch (e) {
      showError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
    // showError cambia en cada render; incluirlo recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (
    experienceId: string,
    locationId: string | null,
    condiciones: CondicionesDePublicacion,
  ) => {
    setGuardando(true);
    try {
      setPublicaciones(await publicar(experienceId, locationId, condiciones));
      setPublicando(false);
      setEditando(null);
      showSuccess('Publicación guardada');
    } catch (e) {
      showError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Pausar o reanudar una publicación.
   *
   * Pausar deja de venderla ahí sin perder sus condiciones ni su horario: se
   * reanuda y sigue donde estaba. Para dejar de ofrecerla del todo se quita.
   */
  const alternarPausa = async (p: Publicacion) => {
    const enPausa = p.propias?.isPublished === false;
    try {
      setPublicaciones(await pausar(p, !enPausa));
      showSuccess(
        enPausa
          ? `${p.title} vuelve a venderse${p.locationName ? ` en ${p.locationName}` : ''}`
          : `${p.title} queda en pausa${p.locationName ? ` en ${p.locationName}` : ''}`,
      );
    } catch (e) {
      showError(mensajeDeError(e));
    }
  };

  const quitar = async (p: Publicacion) => {
    const confirmado = await showConfirmation(
      `¿Quitar «${p.title}» de ${p.locationName ?? 'tu catálogo'}?`,
      'Deja de ofrecerse ahí y se borran sus condiciones. Lo que ya está vendido en esa sede no se cancela.',
      'Sí, quitar',
    );
    if (!confirmado) return;
    try {
      const { publicaciones: filas, reservasPorVenir } = await quitarPublicacion(
        p.experienceId,
        p.locationId,
      );
      setPublicaciones(filas);
      showSuccess(
        reservasPorVenir > 0
          ? `Quitada. Quedan ${reservasPorVenir} reserva${reservasPorVenir === 1 ? '' : 's'} por atender ahí.`
          : 'Quitada del catálogo',
      );
    } catch (e) {
      showError(mensajeDeError(e));
    }
  };

  // Agrupado por pieza: así se lee «esta experiencia está en estos dos sitios»,
  // que es justo la pregunta que trae a esta pantalla.
  const porPieza = useMemo(() => {
    const mapa = new Map<string, Publicacion[]>();
    for (const p of publicaciones) {
      const ya = mapa.get(p.experienceId) ?? [];
      ya.push(p);
      mapa.set(p.experienceId, ya);
    }
    return [...mapa.values()];
  }, [publicaciones]);

  const enUso = publicaciones.filter((p) => p.locationId !== null).length;
  const sinUsar = publicaciones.filter((p) => p.locationId === null).length;

  if (cargando) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <Loader />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#334C5D] dark:text-gray-100">Publicaciones</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Una experiencia es una pieza que se puede usar muchas veces. Aquí decides dónde se
              ofrece y con qué condiciones: la misma puede ser abierta en una sede y privada en
              otra, con otro horario y otro precio.{' '}
              <Link href="/dashboard/experiences" className="text-marca underline">
                Crear o editar las piezas
              </Link>
              .
            </p>
          </div>
          <Button
            onClick={() => setPublicando(true)}
            disabled={piezas.length === 0 || sedes.length === 0}
            className="bg-[#F26726] hover:bg-[#d9551c] shrink-0"
          >
            <AiOutlinePlus className="mr-2" /> Publicar experiencia
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{enUso}</p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Publicaciones en el catálogo
            </p>
          </Card>
          <Card>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sinUsar}</p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Piezas creadas sin publicar
            </p>
          </Card>
        </div>

        {sedes.length === 0 && (
          <Card className="mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Para publicar hace falta al menos una sede.{' '}
              <Link href="/dashboard/locations" className="text-marca underline">
                Registrar una sede
              </Link>
              .
            </p>
          </Card>
        )}

        {porPieza.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Todavía no has creado ninguna experiencia.{' '}
              <Link href="/dashboard/experiences/create" className="text-marca underline">
                Crear la primera
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {porPieza.map((filas) => {
              const pieza = filas[0];
              // A domicilio su fila no tiene sede, pero ES la publicación: lo
              // que está a la venta, con sus condiciones y su pausa.
              const publicada = pieza.atHome ? filas : filas.filter((f) => f.locationId !== null);

              return (
                <div
                  key={pieza.experienceId}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {pieza.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {pieza.duration ? `${pieza.duration} min · ` : ''}
                        {publicada.length === 0
                          ? 'Sin publicar'
                          : `En ${publicada.length} ${publicada.length === 1 ? 'escenario' : 'escenarios'}`}
                      </p>
                      {!pieza.completa && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                          <HiOutlineExclamationCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Para poder venderse le falta {pieza.falta.join(', ')}.{' '}
                            <Link
                              href={`/dashboard/experiences/${pieza.experienceId}/edit`}
                              className="underline"
                            >
                              Completarla
                            </Link>
                          </span>
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/experiences/${pieza.experienceId}/edit`}
                      className="text-xs text-gray-500 hover:text-marca underline shrink-0"
                    >
                      Editar la pieza
                    </Link>
                  </div>

                  {publicada.length === 0 ? (
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pieza.atHome
                          ? 'Es a domicilio: no se publica en una sede, se va donde diga quien reserva.'
                          : 'Esta pieza no se está ofreciendo en ningún sitio todavía.'}
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                      {publicada.map((p) => {
                        const cambios = queCambia(p);
                        return (
                          <li
                            key={`${p.experienceId}:${p.locationId}`}
                            className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <BiMap className="text-[#F26726] shrink-0" />{' '}
                                {p.locationName ?? 'A domicilio'}
                                {p.propias?.isPublished === false && (
                                  <Badge color="warning" className="ml-1">
                                    En pausa
                                  </Badge>
                                )}
                                {p.sedeActiva === false && (
                                  <Badge color="warning" className="ml-1">
                                    Sede apagada
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {cambios.length > 0
                                  ? cambios.join(' · ')
                                  : 'Igual que la experiencia'}
                              </p>
                              <p className="text-xs mt-1.5 flex items-center gap-1.5">
                                <AiOutlineClockCircle className="text-gray-400" />
                                {p.franjas === 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Sin horario aquí: no se puede reservar
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Abre{' '}
                                    {DIAS.map((d) => (
                                      <span
                                        key={d}
                                        className={
                                          p.diasQueAbre.includes(d)
                                            ? 'font-bold text-marca'
                                            : 'text-gray-300 dark:text-gray-600'
                                        }
                                      >
                                        {d}
                                      </span>
                                    ))}
                                    {' · '}
                                    {p.franjas} {p.franjas === 1 ? 'franja' : 'franjas'}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="xs" color="light" onClick={() => setHorarioDe(p)}>
                                <AiOutlineClockCircle className="mr-1" /> Horario
                              </Button>
                              {/* Pausar es dejar de venderla ahí sin perder sus
                                  condiciones ni su horario: se reanuda y sigue
                                  donde estaba. */}
                              <Button
                                size="xs"
                                color="light"
                                onClick={() => void alternarPausa(p)}
                              >
                                {p.propias?.isPublished === false ? (
                                  <>
                                    <AiOutlinePlayCircle className="mr-1" /> Reanudar
                                  </>
                                ) : (
                                  <>
                                    <AiOutlinePauseCircle className="mr-1" /> Pausar
                                  </>
                                )}
                              </Button>
                              <Button size="xs" color="light" onClick={() => setEditando(p)}>
                                <AiOutlineEdit className="mr-1" /> Condiciones
                              </Button>
                              <Button size="xs" color="light" onClick={() => void quitar(p)}>
                                <AiOutlineDelete className="mr-1" /> Quitar
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(publicando || editando) && (
          <PublicarModal
            piezas={piezas}
            sedes={sedes.map((s) => ({ id: s._id, name: s.name, isMain: s.isMain }))}
            publicacion={editando}
            guardando={guardando}
            onGuardar={guardar}
            onCerrar={() => {
              setPublicando(false);
              setEditando(null);
            }}
          />
        )}

        {horarioDe?.locationId && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl my-8">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#334C5D] dark:text-gray-100">
                    Horario de «{horarioDe.title}» en {horarioDe.locationName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Vale solo para este escenario. En las demás sedes, la misma experiencia puede
                    abrir otros días.
                  </p>
                </div>
                <Button color="light" size="sm" onClick={() => { setHorarioDe(null); void cargar(); }}>
                  Cerrar
                </Button>
              </div>
              <div className="p-4 sm:p-6">
                <AvailabilityManager
                  mode="publicacion"
                  experienceId={horarioDe.experienceId}
                  experienceTitle={horarioDe.title}
                  locationId={horarioDe.locationId}
                  locationName={horarioDe.locationName ?? ''}
                  companyId={companyId ?? ''}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
