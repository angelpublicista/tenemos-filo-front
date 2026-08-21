"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from 'flowbite-react';
import { HiCheckCircle, HiClipboardCopy, HiExclamationCircle, HiExternalLink } from 'react-icons/hi';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  despublicar,
  listarDistribucion,
  marcarPublicada,
  obtenerFicha,
  type ChannelType,
  type ExperienciaEnCanales,
  type Ficha,
} from '@/lib/api/channels';

export default function CanalesPage() {
  const { showSuccess, showError, showDestructiveConfirmation } = useSweetAlert();

  const [experiencias, setExperiencias] = useState<ExperienciaEnCanales[]>([]);
  const [cargando, setCargando] = useState(true);

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [enlace, setEnlace] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setExperiencias(await listarDistribucion());
    } catch (err) {
      showError('No se pudo cargar la distribución', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirFicha = async (channel: ChannelType, experienceId: string) => {
    setCargandoFicha(true);
    try {
      const f = await obtenerFicha(channel, experienceId);
      setFicha(f);
      setEnlace(f.listing?.externalUrl ?? '');
    } catch (err) {
      showError('No se pudo preparar la ficha', err instanceof Error ? err.message : undefined);
    } finally {
      setCargandoFicha(false);
    }
  };

  const copiar = async (etiqueta: string, valor: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(etiqueta);
      // Se limpia solo: es un aviso, no un estado que haya que gestionar.
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      showError('Tu navegador no permitió copiar', 'Selecciona el texto y cópialo a mano.');
    }
  };

  const copiarTodo = async () => {
    if (!ficha) return;
    const texto = ficha.campos
      .filter((c) => c.valor)
      .map((c) => `${c.etiqueta}:\n${c.valor}`)
      .join('\n\n');
    await copiar('todo', texto);
  };

  const confirmarPublicada = async () => {
    if (!ficha) return;
    setGuardando(true);
    try {
      await marcarPublicada(ficha.canal.channel, ficha.experiencia.id, {
        externalUrl: enlace.trim() || undefined,
      });
      showSuccess(
        'Registrada como publicada',
        `${ficha.experiencia.title} figura ahora en ${ficha.canal.nombre}.`,
      );
      setFicha(null);
      await cargar();
    } catch (err) {
      showError('No se pudo registrar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const quitarDeCanal = async (channel: ChannelType, exp: ExperienciaEnCanales) => {
    const ok = await showDestructiveConfirmation(
      '¿Quitar del canal?',
      `Se deja de registrar "${exp.title}" como publicada. Recuerda retirarla también en el canal.`,
      'Sí, quitar',
    );
    if (!ok) return;
    try {
      await despublicar(channel, exp.id);
      await cargar();
    } catch (err) {
      showError('No se pudo quitar', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Otros canales</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Lleva tus experiencias a plataformas externas sin volver a escribirlas
        </p>
      </div>

      {/* Por que esto no es automatico. Decirlo aqui evita que el anfitrion
          espere una sincronizacion que ningun canal permite todavia. */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <HiExclamationCircle className="w-5 h-5 text-[#F26726] shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              La carga en OpenTable es asistida
            </p>
            <p className="mt-1">
              OpenTable no permite crear fichas desde fuera: su API está reservada a socios con
              contrato y solo cubre reservas y disponibilidad. Lo que sí podemos hacer es
              prepararte el contenido con sus reglas para que lo pegues en su panel, y llevar el
              registro de dónde quedó publicada cada experiencia.
            </p>
          </div>
        </div>
      </Card>

      <AdminTable
        columnas={['Experiencia', 'OpenTable', '']}
        cargando={cargando}
        vacio={experiencias.length === 0}
        mensajeVacio="Todavía no tienes experiencias que distribuir."
      >
        {experiencias.map((exp) => {
          const ot = exp.canales.find((c) => c.channel === 'OPENTABLE');
          const publicada = ot?.status === 'PUBLISHED';
          return (
            <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{exp.title}</div>
                <div className="text-xs text-gray-500">
                  {exp.status === 'ACTIVE' ? 'Publicada en Filo' : 'Borrador en Filo'}
                </div>
              </td>
              <td className="px-6 py-4">
                {publicada ? (
                  <div className="flex flex-col gap-1">
                    <Badge color="success" className="w-fit">
                      <HiCheckCircle className="w-3 h-3 mr-1 inline" />
                      Publicada
                    </Badge>
                    {ot?.externalUrl && (
                      <a
                        href={ot.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#F26726] hover:underline inline-flex items-center gap-1"
                      >
                        Ver ficha <HiExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : ot?.listo ? (
                  <Badge color="info" className="w-fit">
                    Lista para cargar
                  </Badge>
                ) : (
                  <Badge color="warning" className="w-fit">
                    {ot?.faltantes === 1 ? 'Falta 1 dato' : `Faltan ${ot?.faltantes} datos`}
                  </Badge>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="xs"
                    color="secondary"
                    onClick={() => abrirFicha('OPENTABLE', exp.id)}
                    disabled={cargandoFicha}
                  >
                    {publicada ? 'Ver ficha' : 'Preparar'}
                  </Button>
                  {publicada && (
                    <Button size="xs" color="danger" onClick={() => quitarDeCanal('OPENTABLE', exp)}>
                      Quitar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <Modal show={!!ficha} onClose={() => setFicha(null)} size="3xl">
        <ModalHeader>
          {ficha ? `${ficha.experiencia.title} · ${ficha.canal.nombre}` : ''}
        </ModalHeader>
        <ModalBody>
          {ficha && (
            <div className="space-y-5">
              {ficha.faltantes.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-medium text-yellow-900">
                    Antes de cargarla en {ficha.canal.nombre}, resuelve esto:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                    {ficha.faltantes.map((f) => (
                      <li key={f.campo}>• {f.mensaje}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-3 text-sm">
                    <Link
                      href={`/dashboard/experiences/${ficha.experiencia.id}/edit`}
                      className="text-[#F26726] hover:underline"
                    >
                      Editar la experiencia
                    </Link>
                    <Link href="/dashboard/settings" className="text-[#F26726] hover:underline">
                      Ir a Configuración
                    </Link>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900">Contenido listo para pegar</p>
                  <Button size="xs" color="secondary" onClick={copiarTodo}>
                    <HiClipboardCopy className="w-4 h-4 mr-1" />
                    {copiado === 'todo' ? 'Copiado' : 'Copiar todo'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {ficha.campos
                    .filter((c) => c.valor)
                    .map((campo) => (
                      <div
                        key={campo.etiqueta}
                        className="rounded-lg border border-gray-200 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              {campo.etiqueta}
                            </p>
                            <p
                              className={`text-sm text-gray-900 ${
                                campo.multilinea ? 'whitespace-pre-line' : 'truncate'
                              }`}
                            >
                              {campo.valor}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            color="ghost"
                            onClick={() => copiar(campo.etiqueta, campo.valor)}
                          >
                            {copiado === campo.etiqueta ? 'Copiado' : <HiClipboardCopy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Cómo cargarla</p>
                <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
                  {ficha.canal.instrucciones.map((paso) => (
                    <li key={paso}>{paso}</li>
                  ))}
                </ol>
                <a
                  href={ficha.canal.urlBackoffice}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-[#F26726] hover:underline"
                >
                  Abrir {ficha.canal.nombre} <HiExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enlace de la ficha publicada
                </label>
                <TextInput
                  value={enlace}
                  onChange={(e) => setEnlace(e.target.value)}
                  placeholder="https://www.opentable.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lo confirmas tú porque {ficha.canal.nombre} no nos lo puede avisar.
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={confirmarPublicada}
            disabled={guardando || !ficha?.listo}
          >
            {guardando ? 'Guardando...' : 'Ya está publicada'}
          </Button>
          <Button color="secondary" onClick={() => setFicha(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
