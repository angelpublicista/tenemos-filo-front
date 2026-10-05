"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HiCheck, HiChevronRight, HiOutlineClipboardCheck, HiPhone, HiX } from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import {
  ETIQUETA_SEGUIMIENTO,
  cerrarExperiencia,
  cerrarSeguimiento,
  cuandoVence,
  obtenerIndicadores,
  obtenerPendientes,
  type Indicadores,
  type Pendientes,
} from '@/lib/crm/panel';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const dia = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

/**
 * Lo que necesita atención hoy, antes que nada.
 *
 * El CRM es una herramienta de venta, no un repositorio. Al entrar, lo primero
 * tiene que ser qué hay que hacer —a quién falta contestarle, qué propuesta
 * lleva días sin respuesta— y no una lista de todo lo que existe.
 */
export default function PanelDePendientes() {
  const { showError } = useSweetAlert();
  const [pendientes, setPendientes] = useState<Pendientes | null>(null);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, i] = await Promise.all([obtenerPendientes(), obtenerIndicadores()]);
      setPendientes(p);
      setIndicadores(i);
    } catch (err) {
      console.error('Error cargando el panel:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrar = async (id: string, status: 'HECHO' | 'NO_APLICA') => {
    setCerrando(id);
    try {
      await cerrarSeguimiento(id, status);
      await cargar();
    } catch (err) {
      console.error('Error cerrando el seguimiento:', err);
      showError('No pudimos actualizarlo', 'Inténtalo de nuevo.');
    } finally {
      setCerrando(null);
    }
  };

  /**
   * CRM-26. Cerrar una experiencia que ya pasó.
   *
   * Se pregunta aquí mismo y no se manda a otra pantalla: el pendiente dice
   * "cierra o califica", y mandarlo a buscar dónde hacerlo es la razón por la
   * que estas listas se quedan sin vaciar.
   */
  const cerrarLaExperiencia = async (id: string, titulo: string, vendidas: number) => {
    const { value, isConfirmed } = await Swal.fire({
      title: '¿Cómo terminó?',
      html: `
        <p style="font-size:14px;color:#6b7280;margin-bottom:12px">${titulo}</p>
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">¿Qué pasó?</label>
          <select id="resultado" class="swal2-input" style="width:100%;margin:0">
            <option value="REALIZADA">Se realizó</option>
            <option value="NO_SE_PRESENTO">No se presentó</option>
          </select>
          <!-- TR-09. Cuánta gente vino, que no es lo mismo que cuánta se
               vendió: de diez reservados pueden venir ocho. Hace falta para
               cerrar bien y para poder reportárselo al canal que lo vendió. -->
          <label style="display:block;margin:8px 0 4px">¿Cuántas personas vinieron?</label>
          <input id="asistentes" type="number" min="0" max="${vendidas}" value="${vendidas}"
                 class="swal2-input" style="width:100%;margin:0">
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">
            Se reservaron ${vendidas}.
          </p>
          <label style="display:block;margin:8px 0 4px">Calificación (opcional)</label>
          <select id="rating" class="swal2-input" style="width:100%;margin:0">
            <option value="">Sin calificar</option>
            <option value="5">5 · Excelente</option>
            <option value="4">4 · Buena</option>
            <option value="3">3 · Normal</option>
            <option value="2">2 · Floja</option>
            <option value="1">1 · Mala</option>
          </select>
          <label style="display:block;margin:8px 0 4px">Nota (opcional)</label>
          <input id="notas" class="swal2-input" style="width:100%;margin:0" placeholder="Qué conviene recordar">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Cerrar experiencia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const rating = Number(g('rating'));
        const asistentes = g('asistentes');
        const cuantos = Number(asistentes);
        if (asistentes !== '' && (!Number.isInteger(cuantos) || cuantos < 0 || cuantos > vendidas)) {
          Swal.showValidationMessage(`Entre 0 y ${vendidas} personas.`);
          return false;
        }
        return {
          resultado: g('resultado') as 'REALIZADA' | 'NO_SE_PRESENTO',
          ...(asistentes !== '' ? { asistentes: cuantos } : {}),
          ...(rating ? { rating } : {}),
          ...(g('notas').trim() ? { notas: g('notas').trim() } : {}),
        };
      },
    });
    if (!isConfirmed || !value) return;

    setCerrando(id);
    try {
      await cerrarExperiencia(id, value as Parameters<typeof cerrarExperiencia>[1]);
      await cargar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No pudimos cerrarla', msg || 'Inténtalo de nuevo.');
    } finally {
      setCerrando(null);
    }
  };

  if (cargando) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">Cargando…</div>;
  }

  const seguimientos = pendientes?.seguimientos ?? [];
  const propuestas = pendientes?.prereservas ?? [];
  const porCalificar = pendientes?.porCalificar ?? [];
  const nadaPendiente = seguimientos.length === 0 && propuestas.length === 0 && porCalificar.length === 0;

  return (
    <div className="space-y-6">
      {indicadores && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { etiqueta: 'Propuestas enviadas', valor: String(indicadores.propuestasEnviadas) },
            { etiqueta: 'Ganadas', valor: String(indicadores.ganadas) },
            { etiqueta: 'Perdidas', valor: String(indicadores.perdidas) },
            { etiqueta: 'Abiertas', valor: String(indicadores.pendientes) },
            { etiqueta: 'Ventas', valor: pesos(indicadores.ventas) },
          ].map((k) => (
            <div key={k.etiqueta} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{k.etiqueta}</p>
              <p className="mt-1 text-xl font-semibold text-[#334C5D]">{k.valor}</p>
            </div>
          ))}
          <p className="col-span-2 text-xs text-gray-400 lg:col-span-5">
            Últimos 30 días. Ticket promedio de las ganadas:{' '}
            <strong>{pesos(indicadores.ticketPromedio)}</strong>. Las abiertas no se
            acotan al período: una de hace dos meses sigue pendiente hoy.
          </p>
        </div>
      )}

      {nadaPendiente ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <HiOutlineClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 font-medium text-gray-700">No tienes nada pendiente</p>
          <p className="text-sm text-gray-500">
            Cuando entre una solicitud, aquí aparecerá a quién hay que contestarle.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {seguimientos.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-1 font-semibold text-gray-900">Por contestar</h3>
              <p className="mb-3 text-xs text-gray-500">
                Seguimientos que vencen hoy o ya vencieron.
              </p>
              <ul className="space-y-2">
                {seguimientos.map((s) => {
                  const v = cuandoVence(s.dueAt);
                  const c = s.opportunity.contact;
                  return (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                        v.vencido ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/crm/oportunidades/${s.opportunity.id}`}
                          className="text-sm font-medium text-gray-900 hover:underline"
                        >
                          {c ? `${c.firstName} ${c.lastName ?? ''}`.trim() : s.opportunity.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {ETIQUETA_SEGUIMIENTO[s.kind]} · {v.texto}
                          {c?.phone ? ` · ${c.phone}` : c?.email ? ` · ${c.email}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {/* El teléfono a un clic: el 90% de estos seguimientos
                            se resuelven llamando o escribiendo por WhatsApp. */}
                        {c?.phone && (
                          <a
                            href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                            title="Escribir por WhatsApp"
                          >
                            <HiPhone className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => cerrar(s.id, 'HECHO')}
                          disabled={cerrando === s.id}
                          className="rounded-lg border border-green-300 p-2 text-green-600 hover:bg-green-50 disabled:opacity-40"
                          title="Ya lo contacté"
                        >
                          <HiCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cerrar(s.id, 'NO_APLICA')}
                          disabled={cerrando === s.id}
                          className="rounded-lg border border-gray-300 p-2 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                          title="Ya no aplica"
                        >
                          <HiX className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {propuestas.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-1 font-semibold text-gray-900">Propuestas sin respuesta</h3>
              <p className="mb-3 text-xs text-gray-500">Enviadas hace más de tres días.</p>
              <ul className="space-y-2">
                {propuestas.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/crm/oportunidades/${o.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                      >
                        {o.contact ? `${o.contact.firstName} ${o.contact.lastName ?? ''}`.trim() : o.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {o.proposalSentAt ? `Enviada el ${dia(o.proposalSentAt)}` : 'Sin fecha de envío'}
                        {Number(o.value) > 0 ? ` · ${pesos(Number(o.value))}` : ''}
                      </p>
                    </div>
                    <HiChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {porCalificar.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-1 font-semibold text-gray-900">Experiencias por cerrar</h3>
              <p className="mb-3 text-xs text-gray-500">
                Ya ocurrieron y siguen como confirmadas. Ciérralas y, si quieres, déjales
                su calificación.
              </p>
              <ul className="space-y-2">
                {porCalificar.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {r.experience?.title ?? 'Experiencia'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.reservationNumber} · {dia(r.reservationDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => void cerrarLaExperiencia(r.id, r.experience?.title ?? r.reservationNumber, r.participants ?? 1)}
                      disabled={cerrando === r.id}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {cerrando === r.id ? 'Cerrando…' : 'Cerrar'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
