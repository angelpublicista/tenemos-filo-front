"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card } from 'flowbite-react';
import { HiCheckCircle, HiLockClosed } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  cancelarRenovacionAutomatica,
  crearCheckoutDeSuscripcion,
  getSuscripcion,
  irAPagar,
  type EstadoDeSuscripcion,
} from '@/lib/api/subscription';
import { mensajeDeError } from '@/lib/api/client';
import { pesos } from '@/lib/dinero';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

/** Cuánto se espera a que Wompi avise del pago antes de dejar de insistir. */
const ESPERA_MAXIMA_MS = 90_000;

export default function SuscripcionPage() {
  const { showError, showSuccess, showDestructiveConfirmation } = useSweetAlert();
  const router = useRouter();
  const params = useSearchParams();
  // La pasarela devuelve aquí al anfitrión tras pagar; el webhook es quien
  // confirma, y puede tardar unos segundos en llegar.
  const volvioDePagar = params.get('pago') !== null;

  const [estado, setEstado] = useState<EstadoDeSuscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [esperando, setEsperando] = useState(volvioDePagar);
  const finAnterior = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const s = await getSuscripcion();
      setEstado(s);
      return s;
    } catch (err) {
      showError('No se pudo cargar tu suscripción', err instanceof Error ? err.message : undefined);
      return null;
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar().then((s) => {
      finAnterior.current = s?.endsAt ?? null;
    });
  }, [cargar]);

  // Al volver de pagar, se pregunta cada pocos segundos hasta que la fecha de
  // vencimiento avanza: ese es el aviso de que el pago entró.
  useEffect(() => {
    if (!esperando) return;
    const inicio = Date.now();
    const id = setInterval(async () => {
      const s = await cargar();
      const avanzo = s?.endsAt && s.endsAt !== finAnterior.current;
      if (avanzo || Date.now() - inicio > ESPERA_MAXIMA_MS) {
        clearInterval(id);
        setEsperando(false);
        if (avanzo) router.replace('/dashboard/suscripcion');
      }
    }, 3000);
    return () => clearInterval(id);
  }, [esperando, cargar, router]);

  const pagar = async () => {
    setPagando(true);
    try {
      irAPagar(await crearCheckoutDeSuscripcion());
    } catch (err) {
      showError('No se pudo abrir el pago', err instanceof Error ? err.message : undefined);
      setPagando(false);
    }
  };

  const cancelarRenovacion = async () => {
    const ok = await showDestructiveConfirmation(
      '¿Dejar de renovar automáticamente?',
      'Conservas los días que ya pagaste. Cuando se acaben, el panel se cierra hasta que vuelvas a autorizar el cobro.',
      'Sí, dejar de renovar',
    );
    if (!ok) return;
    setCancelando(true);
    try {
      setEstado(await cancelarRenovacionAutomatica());
      showSuccess('Cobro automático cancelado');
    } catch (err) {
      showError('No se pudo cancelar', mensajeDeError(err));
    } finally {
      setCancelando(false);
    }
  };

  if (cargando || !estado) {
    return (
      <ProtectedRoute roles={['host', 'admin']}>
        <Card className="max-w-2xl mx-auto">
          <p className="text-gray-500">Cargando...</p>
        </Card>
      </ProtectedRoute>
    );
  }

  const { bloqueada, requerida, exenta } = estado;
  const alDia = !bloqueada && estado.endsAt !== null;
  // Con Mercado Pago el cobro es automático; con Wompi, cada mes se paga a mano.
  const automatico = estado.proveedor === 'MERCADO_PAGO';
  const renovacionActiva = automatico && estado.renovacion === 'ACTIVA';
  const nombrePasarela = automatico ? 'Mercado Pago' : 'Wompi';

  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
          <p className="text-sm text-gray-500 mt-1">
            Un solo plan y sin permanencia: dejas de renovar cuando quieras.
          </p>
        </div>

        {esperando && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Estamos confirmando tu pago con {nombrePasarela}. Esto toma unos segundos; no cierres
            esta página.
          </p>
        )}

        {bloqueada && !esperando && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {estado.endsAt
              ? `Tu suscripción venció el ${fecha(estado.endsAt)}.`
              : 'Tu empresa todavía no tiene una suscripción activa.'}{' '}
            Mientras tanto el panel está cerrado. Renueva y vuelves a entrar al instante.
          </p>
        )}

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Plan Tenemos Filo</h2>
              <p className="text-sm text-gray-600">Todo lo de la plataforma, por 30 días.</p>
            </div>
            <Badge color={bloqueada ? 'failure' : alDia || exenta ? 'success' : 'gray'}>
              {exenta
                ? 'Exenta'
                : bloqueada
                  ? 'Vencida'
                  : alDia
                    ? 'Al día'
                    : 'Sin cobro'}
            </Badge>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Plan mensual</span>
              <span className="text-gray-900">{pesos(estado.precio)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">IVA ({estado.ivaPorcentaje}%)</span>
              <span className="text-gray-900">{pesos(estado.iva)}</span>
            </div>
            <div className="flex justify-between border-t mt-1 pt-2 font-semibold">
              <span className="text-gray-900">Total a pagar</span>
              <span className="text-[#F26726]">{pesos(estado.total)}</span>
            </div>
          </div>

          {alDia && estado.endsAt && (
            <p className="text-sm text-gray-600">
              <HiCheckCircle className="inline w-4 h-4 mr-1 text-green-600" />
              Activa hasta el <strong>{fecha(estado.endsAt)}</strong>
              {estado.diasRestantes !== null && ` (${estado.diasRestantes} días)`}.
              {!automatico && ' Si renuevas ahora, los 30 días nuevos se suman a los que te quedan.'}
            </p>
          )}

          {exenta && (
            <p className="text-sm text-gray-600">
              Tu empresa está exenta: no tienes que pagar suscripción.
            </p>
          )}

          {!requerida && !exenta && (
            <p className="text-sm text-gray-600">
              Por ahora la plataforma no exige suscripción. Cuando empiece, te avisaremos antes.
            </p>
          )}

          {renovacionActiva && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p>
                <strong>Cobro automático activo.</strong> Mercado Pago cobra {pesos(estado.total)}{' '}
                cada 30 días y tu suscripción se renueva sola.
              </p>
              {bloqueada && (
                <p className="mt-1">
                  El último cobro no se pudo hacer. Mercado Pago lo reintenta; si no entra, revisa
                  el medio de pago en tu cuenta de Mercado Pago.
                </p>
              )}
              <button
                type="button"
                onClick={cancelarRenovacion}
                disabled={cancelando}
                className="mt-2 cursor-pointer text-xs font-medium underline disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Dejar de renovar automáticamente'}
              </button>
            </div>
          )}

          {automatico && estado.renovacion === 'PENDIENTE' && !esperando && (
            <p className="text-sm text-gray-600">
              Dejaste el cobro automático a medias. Si ya lo autorizaste en Mercado Pago, se
              reflejará aquí en unos minutos; si no, puedes retomarlo.
            </p>
          )}

          {(requerida || bloqueada) && !renovacionActiva && (
            <Button color="primary" onClick={pagar} disabled={pagando || esperando} className="w-fit">
              <HiLockClosed className="w-4 h-4 mr-2" />
              {pagando
                ? 'Abriendo pasarela...'
                : automatico
                  ? `Activar cobro automático de ${pesos(estado.total)}`
                  : bloqueada
                    ? `Pagar ${pesos(estado.total)} y activar`
                    : `Renovar por ${pesos(estado.total)}`}
            </Button>
          )}
          <p className="text-xs text-gray-500">
            {automatico
              ? 'Pago seguro por Mercado Pago. Autorizas una vez y se cobra cada 30 días; puedes cancelarlo cuando quieras y conservas los días que ya pagaste.'
              : 'Pago seguro por Wompi. No guardamos tu tarjeta ni cobramos de forma automática: cada mes decides si renuevas. Te escribiremos antes de que venza.'}
          </p>
        </Card>

        {estado.pagos.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Pagos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Periodo</th>
                    <th className="py-2 pr-4 text-right">Base</th>
                    <th className="py-2 pr-4 text-right">IVA</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estado.pagos.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-4 whitespace-nowrap">{p.paidAt ? fechaCorta(p.paidAt) : '—'}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {p.periodStart && p.periodEnd
                          ? `${fechaCorta(p.periodStart)} – ${fechaCorta(p.periodEnd)}`
                          : '—'}
                        {p.method === 'MANUAL' && (
                          <span className="ml-2 text-xs text-gray-400">registrado por FILO</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">{pesos(p.baseAmount)}</td>
                      <td className="py-2 pr-4 text-right">{pesos(p.vatAmount)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{pesos(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
