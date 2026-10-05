"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'flowbite-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  getDesgloseDeIngresos,
  type DesgloseDeIngresos,
  type FilaDeDesglose,
  type PayoutRole,
} from '@/lib/api/earnings';

/**
 * Los ingresos del periodo, cortados por donde hay que decidir algo (TR-28).
 *
 * Cuatro cortes porque son cuatro preguntas distintas que un anfitrión se hace
 * de verdad: cómo vengo mes a mes, qué experiencia me da más, si lo virtual
 * vale la pena, y cuánto me trae cada canal frente a lo que me cuesta su
 * comisión.
 *
 * El rango arranca en los últimos tres meses: un desglose «de siempre» no se
 * puede leer y no responde a ninguna pregunta real.
 */

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const dia = (f: Date) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "2026-10" en "octubre 2026": la clave es técnica, la etiqueta se lee. */
function etiquetaDeMes(clave: string): string {
  const [a, m] = clave.split('-');
  const i = Number(m) - 1;
  return MESES[i] ? `${MESES[i]} ${a}` : clave;
}

function Corte({
  titulo,
  ayuda,
  filas,
  esPeriodo = false,
  mostrarComisionDeCanal = false,
}: {
  titulo: string;
  ayuda: string;
  filas: FilaDeDesglose[];
  esPeriodo?: boolean;
  mostrarComisionDeCanal?: boolean;
}) {
  if (filas.length === 0) return null;

  // La barra se mide contra la fila mayor: compara de un vistazo sin hacer
  // cuentas, que es lo único que se le pide a un desglose.
  const maximo = Math.max(...filas.map((f) => f.tuyo), 1);

  return (
    <Card>
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{titulo}</h3>
        <p className="text-xs text-gray-500">{ayuda}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.clave}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {esPeriodo ? etiquetaDeMes(f.clave) : f.etiqueta}
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {pesos(f.tuyo)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-[#F26726]"
                style={{ width: `${Math.max(2, (f.tuyo / maximo) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-gray-500">
              {f.reservas} {f.reservas === 1 ? 'reserva' : 'reservas'} · {f.personas} personas ·{' '}
              {pesos(f.vendido)} vendidos
              {mostrarComisionDeCanal && f.comisionDeCanal > 0 && (
                <> · {pesos(f.comisionDeCanal)} de comisión del canal</>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function DesgloseDelPeriodo({ role }: { role: PayoutRole }) {
  const { showError } = useSweetAlert();

  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setDate(1);
    return dia(d);
  });
  const [hasta, setHasta] = useState(() => dia(new Date()));
  const [datos, setDatos] = useState<DesgloseDeIngresos | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await getDesgloseDeIngresos({ desde, hasta, role }));
    } catch (err) {
      showError('No se pudo cargar el desglose', mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, role, showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nada = !cargando && (datos?.totales.reservas ?? 0) === 0;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Desglose del periodo
          </h2>
          <p className="text-sm text-gray-500">
            {role === 'RESELLER'
              ? 'Tus comisiones, por dónde vinieron.'
              : 'Tus ingresos, por dónde vinieron.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </label>
          <Button size="xs" color="gray" onClick={() => void cargar()} disabled={cargando}>
            Actualizar
          </Button>
        </div>
      </div>

      {cargando && <p className="text-sm text-gray-500">Calculando…</p>}

      {nada && (
        <Card>
          <p className="text-sm text-gray-500">
            No hay nada cobrado en ese rango. Prueba con otras fechas.
          </p>
        </Card>
      )}

      {!cargando && datos && !nada && (
        <>
          <Card className="mb-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {pesos(datos.totales.tuyo)}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {role === 'RESELLER' ? 'Tus comisiones' : 'Tus ingresos'}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {pesos(datos.totales.vendido)}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Vendido</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {datos.totales.reservas}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Reservas · {datos.totales.personas} personas
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Corte
              titulo="Mes a mes"
              ayuda="Cómo vienes comparado con el mes anterior"
              filas={datos.porPeriodo}
              esPeriodo
            />
            <Corte
              titulo="Por experiencia"
              ayuda="Cuál te deja más, de mayor a menor"
              filas={datos.porExperiencia}
            />
            <Corte
              titulo="Por modalidad"
              ayuda="Si lo presencial y lo virtual se comportan igual"
              filas={datos.porModalidad}
            />
            <Corte
              titulo="Por canal"
              ayuda="Qué te trae cada uno, y lo que cuesta su comisión"
              filas={datos.porCanal}
              mostrarComisionDeCanal
            />
          </div>
        </>
      )}
    </section>
  );
}
