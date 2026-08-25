"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from 'flowbite-react';
import { HiCalendar, HiClock, HiLocationMarker, HiUsers } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SkeletonCard } from '@/components/Skeleton';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_PAGO,
  listarMisReservas,
  type EstadoReserva,
  type MiReserva,
} from '@/lib/api/misReservas';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const COLOR_ESTADO: Record<EstadoReserva, string> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'info',
  CANCELLED: 'gray',
  NO_SHOW: 'gray',
  RESCHEDULED: 'warning',
};

/** Una reserva ya pasada no es algo que el cliente vaya a hacer. */
function esFutura(r: MiReserva) {
  return new Date(r.reservationDate).getTime() >= Date.now();
}

function direccion(address: unknown): string {
  if (!address || typeof address !== 'object') return '';
  const a = address as Record<string, string | undefined>;
  return [a.street, a.city].filter(Boolean).join(', ');
}

export default function MisReservasPage() {
  const { sanityUser } = useAuth();
  const { showError } = useSweetAlert();
  const [reservas, setReservas] = useState<MiReserva[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setReservas(await listarMisReservas());
    } catch (err) {
      showError('No se pudieron cargar tus reservas', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!sanityUser) return;
    void cargar();
  }, [cargar, sanityUser]);

  const proximas = reservas.filter(esFutura);
  const pasadas = reservas.filter((r) => !esFutura(r));

  const tarjeta = (r: MiReserva) => (
    <Card key={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {r.experience?.title ?? 'Experiencia'}
          </h3>
          <p className="text-sm text-gray-500">{r.company?.companyName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge color={COLOR_ESTADO[r.status]} className="w-fit">
            {ETIQUETA_ESTADO[r.status]}
          </Badge>
          {r.paymentStatus !== 'PAID' && r.status !== 'CANCELLED' && (
            <span className="text-xs text-[#F26726]">{ETIQUETA_PAGO[r.paymentStatus]}</span>
          )}
        </div>
      </div>

      <div className="mt-1 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
        <p className="flex items-center gap-2">
          <HiCalendar className="w-4 h-4 text-[#F26726] shrink-0" />
          {fechaLarga(r.reservationDate)}
        </p>
        {r.experience?.duration && (
          <p className="flex items-center gap-2">
            <HiClock className="w-4 h-4 text-gray-400 shrink-0" />
            {r.experience.duration} minutos
          </p>
        )}
        <p className="flex items-center gap-2">
          <HiUsers className="w-4 h-4 text-gray-400 shrink-0" />
          {r.participants} {r.participants === 1 ? 'persona' : 'personas'}
        </p>
        {r.location && (
          <p className="flex items-center gap-2">
            <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
            {r.location.name}
            {direccion(r.location.address) ? ` — ${direccion(r.location.address)}` : ''}
          </p>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="text-sm">
          <span className="text-gray-500">Nº </span>
          <code className="text-gray-900 dark:text-gray-100">{r.reservationNumber}</code>
        </div>
        {typeof r.pricing?.total === 'number' && (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {pesos(r.pricing.total)}
          </span>
        )}
      </div>

      {/* El contacto del anfitrion importa mas que cualquier boton: si hay
          que cambiar algo, es con el con quien se habla. */}
      {(r.company?.companyPhone || r.company?.companyEmail) && esFutura(r) && (
        <p className="text-xs text-gray-500">
          ¿Necesitas cambiar algo? Escribe a{' '}
          {r.company.companyEmail ?? r.company.companyPhone}
        </p>
      )}
    </Card>
  );

  return (
    <ProtectedRoute>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis reservas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Las experiencias que has reservado
        </p>
      </div>

      {cargando ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : reservas.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-gray-600 dark:text-gray-300">Todavía no tienes reservas.</p>
            <p className="mt-1 text-sm text-gray-500">
              Cuando reserves una experiencia aparecerá aquí, con sus datos y su estado.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Próximas
            </h2>
            {proximas.length === 0 ? (
              <Card>
                <p className="py-4 text-center text-sm text-gray-500">
                  No tienes reservas próximas.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">{proximas.map(tarjeta)}</div>
            )}
          </section>

          {pasadas.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Anteriores
              </h2>
              <div className="grid gap-4 md:grid-cols-2 opacity-75">{pasadas.map(tarjeta)}</div>
            </section>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
