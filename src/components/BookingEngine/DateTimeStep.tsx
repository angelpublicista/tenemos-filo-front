"use client";

import React, { useState, useEffect, useMemo } from 'react';
import CalendarPicker from '@/components/CalendarPicker';
import TimePicker from '@/components/TimePicker';
import { HiArrowLeft, HiArrowRight, HiUsers } from 'react-icons/hi';
import type { BookingExperience, BookingLocationAddress, SelectedAddon } from '@/components/BookingEngine/MotorReservas';
import type { AvailabilitySchedule } from '@/types';
import { condicionesDeSede, horariosDeSede } from '@/lib/experiencias/condicionesDeSede';

function formatPrice(price: number, currency: string) {
  return price.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function formatAddress(address: BookingLocationAddress | string | undefined): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, address.city, address.state, address.country]
    .filter(Boolean)
    .join(', ');
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const soloElDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * TR-35. Si este horario se aplica en esa fecha.
 *
 * Un horario semanal sin vigencia ofrecería sábados de dentro de cinco años
 * que nadie decidió abrir. Sin fecha final —los horarios creados antes de
 * esta regla— se comporta como antes: se repite indefinidamente.
 */
function rigeEseDia(schedule: AvailabilitySchedule, date: Date): boolean {
  const dia = soloElDia(date);
  if (schedule.validFrom && dia < schedule.validFrom) return false;
  if (schedule.validUntil && dia > schedule.validUntil) return false;
  return true;
}

/**
 * Las horas en que se puede empezar ese día.
 *
 * Tres cosas las recortan: que la franja tenga sitio para la duración más la
 * limpieza, que la fecha caiga dentro de la vigencia del horario (TR-35), y
 * la anticipación mínima de la experiencia, que ahora es suya y no del
 * horario: un mismo calendario sirve a una cata que se reserva el mismo día y
 * a una cena de quince que hay que comprar con dos días.
 */
function franjasDisponibles(
  date: Date,
  schedules: AvailabilitySchedule[],
  duration: number,
  limpieza = 0,
  horasDeAviso = 0,
): string[] {
  if (!schedules || schedules.length === 0) {
    const defaults: string[] = [];
    for (let h = 8; h <= 20; h++) {
      defaults.push(`${String(h).padStart(2, '0')}:00`);
      defaults.push(`${String(h).padStart(2, '0')}:30`);
    }
    return defaults;
  }

  const dayKey = DAYS_OF_WEEK[date.getDay()];
  const slots = new Set<string>();

  /**
   * TR-06. Lo que ya no se puede reservar por falta de anticipación.
   *
   * Cada horario dice cuánta necesita el anfitrión: comprar para una cena de
   * quince personas no se hace a las seis de la tarde. El API lo rechaza
   * igual, pero ofrecer una hora para que luego falle es hacer perder el
   * tiempo a quien está reservando.
   */
  const ahora = Date.now();
  const avisoMs = horasDeAviso * 3_600_000;

  schedules.forEach(schedule => {
    if (!rigeEseDia(schedule, date)) return;
    const daySchedule = schedule.weeklySchedule?.[dayKey];
    if (!daySchedule?.isActive) return;

    // `franjas` es el nombre de ahora; `timeSlots` son los horarios guardados
    // antes del renombre, que se siguen leyendo.
    const franjas = daySchedule.franjas ?? daySchedule.timeSlots ?? [];
    franjas.forEach((slot: { startTime: string; endTime: string }) => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      // TR-19. La limpieza tiene que caber antes de cerrar: ofrecer una cena
      // que acaba justo a la hora de cierre deja al equipo recogiendo fuera
      // de horario. El montaje no se descuenta aquí porque se hace antes de
      // abrir, y restarlo quitaría el primer turno del día.
      for (let m = startMin; m + duration + limpieza <= endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        if (avisoMs > 0) {
          const cuando = new Date(date);
          cuando.setHours(h, min, 0, 0);
          if (cuando.getTime() - ahora < avisoMs) continue;
        }
        slots.add(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      }
    });
  });

  return Array.from(slots).sort();
}

function isDateBlocked(date: Date, schedules: AvailabilitySchedule[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return schedules?.some(s => s.blockedDates?.some(b => b.date === dateStr)) ?? false;
}

interface Props {
  experience: BookingExperience;
  onNext: (date: Date, time: string, participants: number, locationId?: string, locationName?: string, selectedAddons?: SelectedAddon[], serviceAddress?: string) => void;
  onBack: () => void;
}

export default function DateTimeStep({ experience, onNext, onBack }: Props) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [personasElegidas, setParticipants] = useState(experience.minCapacity ?? 1);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  /** Dónde hay que ir, cuando la experiencia es a domicilio. */
  const [serviceAddress, setServiceAddress] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  // Por posicion, no por `_key`: ese campo venia de Sanity y hoy nadie lo
  // escribe, asi que todos los addons compartian la misma clave `undefined`
  // y marcar uno los marcaba todos.
  const [addonsElegidos, setAddonsElegidos] = useState<Set<number>>(new Set());

  const availableAddons = useMemo(
    () => (experience.addons ?? []).filter(a => a.name && typeof a.price === 'number'),
    [experience.addons]
  );

  /**
   * Las condiciones de la sede elegida. La misma experiencia puede estar en el
   * local del centro como abierta y en la finca como privada, con otro aforo,
   * otro precio y otra anticipación; sin esto se ofrecían en las dos las de la
   * experiencia, y el API acababa rechazando la reserva.
   */
  const condiciones = useMemo(
    () => condicionesDeSede(experience, locationId),
    [experience, locationId],
  );

  const todosLosHorarios = useMemo(
    () => (experience.availabilitySchedules ?? []) as AvailabilitySchedule[],
    [experience.availabilitySchedules]
  );
  // Los de la sede elegida: los sábados que solo abre la finca no tienen por
  // qué aparecer en el local del centro.
  const schedules = useMemo(
    () => horariosDeSede(todosLosHorarios, locationId),
    [todosLosHorarios, locationId],
  );
  /**
   * TR-35. El último día que algún horario sigue ofreciendo (si todos tienen
   * fecha final). Se le pone tope al calendario para no dejar que alguien
   * navegue tres meses por un calendario que ya no ofrece nada.
   *
   * Si algún horario no tiene fecha final, no hay tope: ese se repite
   * indefinidamente y el tope sería mentira.
   */
  const ultimoDiaConHorario = useMemo(() => {
    if (schedules.length === 0) return undefined;
    if (schedules.some((s) => !s.validUntil)) return undefined;
    const fechas = schedules.map((s) => s.validUntil as string).sort();
    const ultima = fechas[fechas.length - 1];
    return ultima ? new Date(`${ultima}T23:59:59`) : undefined;
  }, [schedules]);

  const locations = useMemo(() => experience.locations ?? [], [experience.locations]);
  // A domicilio no se elige sede: se va a donde diga quien reserva, y lo que
  // hace falta es su dirección.
  const aDomicilio = experience.atHome === true;
  const isPresential = !aDomicilio;
  const hasLocations = locations.length > 0;
  const hasMultipleLocations = isPresential && locations.length > 1;
  const singleLocation = isPresential && locations.length === 1 ? locations[0] : null;
  const singleLocationId = singleLocation?._id;

  // Auto-select if only one location
  useEffect(() => {
    if (singleLocationId) setLocationId(singleLocationId);
  }, [singleLocationId]);

  useEffect(() => {
    if (!date) { setSlots([]); setTime(''); return; }
    const newSlots = franjasDisponibles(
      date,
      schedules,
      experience.duration ?? 60,
      condiciones.cleanupTime,
      condiciones.minimumNotice,
    );
    setSlots(newSlots);
    setTime('');
  }, [date, schedules, experience.duration, condiciones.cleanupTime, condiciones.minimumNotice]);

  /**
   * Las personas que de verdad caben en la sede elegida.
   *
   * Cambiar de sede puede cambiar el aforo: si en la finca caben 8 y se venía
   * del local del centro, donde caben 20, el número se recorta aquí en vez de
   * dejar que el API rechace la reserva al final. Se recorta al leerlo y no
   * guardando otro valor: volver a la sede grande devuelve el número que la
   * persona había elegido, en vez de dejarle el recorte puesto.
   */
  const participants = Math.min(
    Math.max(personasElegidas, condiciones.minCapacity),
    condiciones.capacity || personasElegidas,
  );

  const canContinue = !!date && !!time && participants >= condiciones.minCapacity &&
    (!isPresential || !hasLocations || !!locationId) &&
    // Sin dirección no se puede ir: es el equivalente a no haber elegido sede.
    (!aDomicilio || serviceAddress.trim().length > 0);

  const buildSelectedAddons = (): SelectedAddon[] => {
    return availableAddons
      .filter((_, i) => addonsElegidos.has(i))
      .map(a => ({
        name: a.name,
        price: a.price,
        priceType: a.priceType,
        quantity: a.priceType === 'per_person' ? participants : 1,
      }));
  };

  const currentAddons = buildSelectedAddons();
  const baseSubtotal = condiciones.basePrice * participants;
  const addonsSubtotal = currentAddons.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const runningTotal = baseSubtotal + addonsSubtotal;
  const currency = experience.currency ?? 'COP';

  const handleNext = () => {
    if (!date || !time) return;
    const loc = locations.find(l => l._id === locationId);
    onNext(
      date,
      time,
      participants,
      locationId,
      loc?.name,
      buildSelectedAddons(),
      aDomicilio ? serviceAddress.trim() : undefined,
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <HiArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Fecha y hora</h2>
        <p className="text-xs text-marca font-semibold uppercase tracking-wide mt-1.5">{experience.title}</p>
      </div>

      <div className="space-y-6">
        {/* A domicilio: la dirección de quien reserva. Va donde iría la sede,
            y antes de la fecha, por el mismo motivo: es parte de decidir
            dónde ocurre. */}
        {aDomicilio && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5" htmlFor="direccion">
              Dirección donde quieres la experiencia
            </label>
            <input
              id="direccion"
              type="text"
              value={serviceAddress}
              onChange={(e) => setServiceAddress(e.target.value)}
              placeholder="Calle 93 # 13-24, apto 502"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-marca focus:ring-1 focus:ring-marca outline-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              El anfitrión va hasta allí. La compartimos solo con él.
            </p>
          </div>
        )}

        {/* Sede. Va ANTES de la fecha: la sede decide qué horas hay, qué aforo
            y qué precio, así que elegirla después dejaría la pantalla
            enseñando las condiciones de otra. */}
        {isPresential && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">Sede</label>
            {hasMultipleLocations ? (
              <div className="space-y-2">
                {locations.map(loc => {
                  const cityOnly = typeof loc.address === 'object' && loc.address ? loc.address.city : '';
                  const display = experience.hideAddress ? (cityOnly || '') : formatAddress(loc.address);
                  return (
                    <button
                      key={loc._id}
                      type="button"
                      onClick={() => setLocationId(loc._id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                        locationId === loc._id
                          ? 'border-marca bg-marca-tenue text-marca font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="font-medium">{loc.name}</span>
                      {display && <span className="text-gray-400 ml-2">— {display}</span>}
                      {(() => {
                        // Solo lo que cambia aquí: repetir el precio de la
                        // experiencia en cada sede alargaría la lista sin
                        // decir nada.
                        const f = (experience.locationListings ?? []).find(x => x.locationId === loc._id);
                        const propio = [
                          f?.kind === 'PRIVADA' ? 'solo para grupo completo' : '',
                          f?.basePrice != null ? `${formatPrice(f.basePrice, experience.currency ?? 'COP')} por persona` : '',
                          f?.capacity != null ? `hasta ${f.capacity} personas` : '',
                        ].filter(Boolean);
                        return propio.length ? (
                          <span className="block text-xs text-gray-500 mt-0.5">{propio.join(' · ')}</span>
                        ) : null;
                      })()}
                    </button>
                  );
                })}
              </div>
            ) : singleLocation ? (
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-200">
                <span className="font-medium">{singleLocation.name}</span>
                {(() => {
                  const cityOnly = typeof singleLocation.address === 'object' && singleLocation.address ? singleLocation.address.city : '';
                  const display = experience.hideAddress ? (cityOnly || '') : formatAddress(singleLocation.address);
                  return display ? <span className="text-gray-400 ml-1">— {display}</span> : null;
                })()}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                Esta experiencia aún no tiene sedes configuradas. Podrás coordinar el lugar con el anfitrión.
              </p>
            )}
          </div>
        )}

        {/* Fecha */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">Fecha</label>
          <CalendarPicker
            value={date}
            onChange={(d) => {
              if (isDateBlocked(d, schedules)) return;
              setDate(d);
            }}
            minDate={new Date()}
            maxDate={ultimoDiaConHorario}
            placeholder="Selecciona una fecha"
          />
        </div>

        {/* Hora */}
        {date && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">Hora</label>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                No hay horarios disponibles para este día.
              </p>
            ) : (
              <TimePicker value={time} onChange={setTime} slots={slots} placeholder="Selecciona una hora" />
            )}
          </div>
        )}

        {/* Personas */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2.5">
            <HiUsers className="w-4 h-4 text-gray-400" /> Número de personas
          </label>
          <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setParticipants(Math.max(condiciones.minCapacity, participants - 1))}
                disabled={participants <= condiciones.minCapacity}
                className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:border-marca hover:text-marca disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
              >
                −
              </button>
              <span className="min-w-8 text-center text-lg font-bold text-gray-900">{participants}</span>
              <button
                type="button"
                onClick={() => setParticipants(Math.min(condiciones.capacity, participants + 1))}
                disabled={participants >= condiciones.capacity}
                className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:border-marca hover:text-marca disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
              >
                +
              </button>
            </div>
            <span className="text-xs text-gray-400 text-right">
              {condiciones.minCapacity > 1 ? `Mín. ${condiciones.minCapacity}` : ''}
              {condiciones.minCapacity > 1 ? <br /> : ''}
              Máx. {condiciones.capacity}
            </span>
          </div>
        </div>

        {/* Adiciones */}
        {availableAddons.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">
              Adiciones <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <div className="space-y-2">
              {availableAddons.map((addon, i) => {
                const checked = addonsElegidos.has(i);
                const unitLabel = addon.priceType === 'per_person' ? '/persona' : '';
                const lineTotal = addon.priceType === 'per_person'
                  ? addon.price * participants
                  : addon.price;
                return (
                  <button
                    key={`${addon.name}-${i}`}
                    type="button"
                    onClick={() => {
                      setAddonsElegidos(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      checked
                        ? 'border-marca bg-marca-tenue'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'border-marca bg-marca' : 'border-gray-300 bg-white'
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                          <span className="text-sm font-semibold text-[#334C5D] shrink-0">
                            {formatPrice(addon.price, experience.currency)}
                            <span className="text-xs text-gray-400 font-normal ml-0.5">{unitLabel}</span>
                          </span>
                        </div>
                        {addon.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>
                        )}
                        {checked && addon.priceType === 'per_person' && participants > 1 && (
                          <p className="text-xs text-marca font-medium mt-1">
                            {participants} × {formatPrice(addon.price, experience.currency)} = {formatPrice(lineTotal, experience.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <div className="mt-7 pt-6 border-t border-gray-100 space-y-4">
        {experience.basePrice != null && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {formatPrice(experience.basePrice, currency)} × {participants} persona{participants > 1 ? 's' : ''}
              </span>
              <span className="text-gray-700">{formatPrice(baseSubtotal, currency)}</span>
            </div>
            {currentAddons.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                {currentAddons.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 truncate pr-2">
                      {a.name}
                      {a.priceType === 'per_person' && a.quantity > 1 && (
                        <span className="text-gray-400"> ({a.quantity}×)</span>
                      )}
                    </span>
                    <span className="text-gray-700 shrink-0">{formatPrice(a.price * a.quantity, currency)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Subtotal</span>
              <span className="text-lg font-bold text-[#334C5D]">{formatPrice(runningTotal, currency)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={!canContinue}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all ${
            canContinue
              ? 'bg-marca hover:bg-marca-fuerte text-marca-contraste shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuar <HiArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
