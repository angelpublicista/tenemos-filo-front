"use client";

// Resumen, estadísticas y gráficas de lo que ha generado el catálogo de un
// revendedor: cuánta gente lo mira, en qué paso se va y cuánto reserva.
//
// Sin librería de gráficas: son dos series y un embudo, y SVG a mano pesa menos
// que cualquier dependencia. Cada barra y cada punto llevan <title>, así que el
// valor exacto sale al pasar el cursor y lo lee un lector de pantalla.
import React, { useEffect, useState } from 'react';
import { Spinner } from 'flowbite-react';
import { HiOutlineCursorClick, HiOutlineTicket, HiOutlineUserGroup, HiOutlineCash, HiOutlineTrendingUp } from 'react-icons/hi';
import { getEstadisticasDeMiCanal, type EstadisticasDeMiCanal } from '@/lib/api/estadisticasDeMiCanal';
import { mensajeDeError } from '@/lib/api/client';
import { pesos } from '@/lib/dinero';

const NARANJA = '#F26726';
const TEAL = '#19A3A2';
const PIZARRA = '#334C5D';

const PERIODOS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
];

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Realizadas',
  CANCELLED: 'Canceladas',
  NO_SHOW: 'No se presentaron',
};
const COLOR_ESTADO: Record<string, string> = {
  PENDING: '#EBD52C',
  CONFIRMED: TEAL,
  COMPLETED: PIZARRA,
  CANCELLED: '#9CA3AF',
  NO_SHOW: '#E23694',
};

const corta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

const tarjeta =
  'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4';

function Kpi({
  titulo,
  valor,
  nota,
  icono: Icono,
  color,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  icono: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className={tarjeta}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{titulo}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
            {valor}
          </p>
          {nota && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{nota}</p>}
        </div>
        <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color }}>
          <Icono className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

/** Barras o área sobre una serie diaria. Sin texto dentro del SVG: no se deforma. */
function GraficaDiaria({
  datos,
  color,
  tipo,
  formato = (n) => String(n),
  vacio,
}: {
  datos: Array<{ fecha: string; valor: number }>;
  color: string;
  tipo: 'barras' | 'area';
  formato?: (n: number) => string;
  vacio: string;
}) {
  const max = Math.max(...datos.map((d) => d.valor), 0);
  if (datos.length === 0 || max === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">{vacio}</p>;
  }

  const W = 600;
  const H = 160;
  const paso = W / datos.length;
  const y = (v: number) => H - (v / max) * (H - 8);

  const puntos = datos.map((d, i) => `${i * paso + paso / 2},${y(d.valor)}`);
  const area = `M ${paso / 2},${H} L ${puntos.join(' L ')} L ${(datos.length - 1) * paso + paso / 2},${H} Z`;

  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
        <span>Máx. {formato(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H - f * (H - 8)}
            y2={H - f * (H - 8)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={1}
          />
        ))}
        {tipo === 'area' ? (
          <>
            <path d={area} fill={color} fillOpacity={0.15} />
            <polyline points={puntos.join(' ')} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            {datos.map((d, i) => (
              <circle key={d.fecha} cx={i * paso + paso / 2} cy={y(d.valor)} r={datos.length > 45 ? 0 : 3} fill={color}>
                <title>{`${corta(d.fecha)}: ${formato(d.valor)}`}</title>
              </circle>
            ))}
          </>
        ) : (
          datos.map((d, i) => (
            <rect
              key={d.fecha}
              x={i * paso + paso * 0.15}
              width={paso * 0.7}
              y={y(d.valor)}
              height={H - y(d.valor)}
              fill={color}
              rx={2}
            >
              <title>{`${corta(d.fecha)}: ${formato(d.valor)}`}</title>
            </rect>
          ))
        )}
      </svg>
      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1">
        <span>{corta(datos[0].fecha)}</span>
        <span>{corta(datos[datos.length - 1].fecha)}</span>
      </div>
    </div>
  );
}

export default function PanelDeEstadisticas() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState<EstadisticasDeMiCanal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - (dias - 1) * 24 * 60 * 60 * 1000);
    desde.setHours(0, 0, 0, 0);
    getEstadisticasDeMiCanal({ dateFrom: desde.toISOString(), dateTo: hasta.toISOString() })
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeDeError(e)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [dias]);

  const r = datos?.resumen;
  const maxEmbudo = Math.max(...(datos?.embudo.map((e) => e.sesiones) ?? [0]), 1);
  const totalEstados = (datos?.porEstado ?? []).reduce((a, e) => a + e.cantidad, 0);

  return (
    <section aria-label="Estadísticas de tu catálogo" className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Qué está pasando en tu catálogo
        </h2>
        <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              onClick={() => setDias(p.dias)}
              aria-pressed={dias === p.dias}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                dias === p.dias
                  ? 'bg-[#F26726] text-white'
                  : 'text-[#334C5D] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
          <p className="text-red-800 text-sm">No se pudieron cargar las estadísticas. {error}</p>
        </div>
      )}

      {cargando && !datos ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : datos && r ? (
        <div className={cargando ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            <Kpi titulo="Visitas" valor={String(r.visitas)} nota="personas distintas" icono={HiOutlineCursorClick} color={PIZARRA} />
            <Kpi
              titulo="Reservas"
              valor={String(r.reservas)}
              nota={r.canceladas > 0 ? `${r.canceladas} cancelada${r.canceladas === 1 ? '' : 's'}` : undefined}
              icono={HiOutlineTicket}
              color={NARANJA}
            />
            <Kpi titulo="Personas" valor={String(r.personas)} icono={HiOutlineUserGroup} color={TEAL} />
            <Kpi titulo="Comisión generada" valor={pesos(r.comisionGenerada)} nota={`en ventas de ${pesos(r.ventasTotales)}`} icono={HiOutlineCash} color="#EBD52C" />
            <Kpi
              titulo="Conversión"
              valor={r.conversion === null ? '—' : `${r.conversion.toLocaleString('es-CO')}%`}
              nota={r.conversion === null ? 'aún sin visitas medidas' : 'visitas que reservan'}
              icono={HiOutlineTrendingUp}
              color="#E23694"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <div className={tarjeta}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Visitas por día
              </h3>
              <GraficaDiaria
                datos={datos.serie.map((s) => ({ fecha: s.fecha, valor: s.visitas }))}
                color={PIZARRA}
                tipo="area"
                vacio="Aún nadie ha abierto tu catálogo en este periodo."
              />
            </div>
            <div className={tarjeta}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Reservas por día
              </h3>
              <GraficaDiaria
                datos={datos.serie.map((s) => ({ fecha: s.fecha, valor: s.reservas }))}
                color={NARANJA}
                tipo="barras"
                vacio="No hay reservas en este periodo."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <div className={tarjeta}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Dónde se va la gente
              </h3>
              <ul className="space-y-2">
                {datos.embudo.map((e, i) => {
                  const previo = i > 0 ? datos.embudo[i - 1].sesiones : null;
                  const paso = previo && previo > 0 ? Math.round((e.sesiones / previo) * 100) : null;
                  return (
                    <li key={e.paso}>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-0.5">
                        <span>{e.paso}</span>
                        <span className="tabular-nums">
                          {e.sesiones}
                          {paso !== null && <span className="text-gray-400"> · {paso}% del paso anterior</span>}
                        </span>
                      </div>
                      <div className="h-3 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${(e.sesiones / maxEmbudo) * 100}%`,
                            backgroundColor: i === datos.embudo.length - 1 ? NARANJA : TEAL,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Los pasos cuentan personas distintas; «Reservaron» cuenta reservas.
              </p>
            </div>

            <div className={tarjeta}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Estado de tus reservas
              </h3>
              {totalEstados === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">No hay reservas en este periodo.</p>
              ) : (
                <>
                  <div className="flex h-4 rounded overflow-hidden mb-3" role="img" aria-label="Reservas por estado">
                    {datos.porEstado.map((e) => (
                      <div
                        key={e.estado}
                        style={{ width: `${(e.cantidad / totalEstados) * 100}%`, backgroundColor: COLOR_ESTADO[e.estado] ?? '#9CA3AF' }}
                        title={`${ETIQUETA_ESTADO[e.estado] ?? e.estado}: ${e.cantidad}`}
                      />
                    ))}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {datos.porEstado.map((e) => (
                      <li key={e.estado} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_ESTADO[e.estado] ?? '#9CA3AF' }} />
                        <span className="flex-1">{ETIQUETA_ESTADO[e.estado] ?? e.estado}</span>
                        <span className="tabular-nums font-medium">{e.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className={tarjeta}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Experiencias que más funcionan
            </h3>
            {datos.topExperiencias.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Cuando tu catálogo reciba visitas y reservas, aquí verás cuáles destacan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-1 pr-4 font-medium">Experiencia</th>
                      <th className="py-1 pr-4 font-medium text-right">Vistas</th>
                      <th className="py-1 pr-4 font-medium text-right">Reservas</th>
                      <th className="py-1 font-medium text-right">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.topExperiencias.map((t) => (
                      <tr key={t.experienceId} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        <td className="py-2 pr-4">{t.titulo}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{t.vistas}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{t.reservas}</td>
                        <td className="py-2 text-right tabular-nums">{pesos(t.comision)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
