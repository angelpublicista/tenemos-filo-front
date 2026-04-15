"use client";

import React, { useState, useEffect, useMemo } from 'react';
import CalendarPicker from '@/components/CalendarPicker';
import TimePicker from '@/components/TimePicker';
import { HiArrowLeft, HiArrowRight, HiUsers } from 'react-icons/hi';
import type { BookingExperience, BookingLocationAddress } from '@/app/book/[companyId]/page';
import type { AvailabilitySchedule } from '@/types';

function formatAddress(address: BookingLocationAddress | string | undefined): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, address.city, address.state, address.country]
    .filter(Boolean)
    .join(', ');
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getAvailableSlots(date: Date, schedules: AvailabilitySchedule[], duration: number): string[] {
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

  schedules.forEach(schedule => {
    const daySchedule = schedule.weeklySchedule?.[dayKey];
    if (!daySchedule?.isActive || !daySchedule.timeSlots) return;

    daySchedule.timeSlots.forEach((slot: { startTime: string; endTime: string }) => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      for (let m = startMin; m + duration <= endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
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
  onNext: (date: Date, time: string, participants: number, locationId?: string, locationName?: string) => void;
  onBack: () => void;
}

export default function DateTimeStep({ experience, onNext, onBack }: Props) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [participants, setParticipants] = useState(experience.minCapacity ?? 1);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);

  const schedules = useMemo(
    () => (experience.availabilitySchedules ?? []) as AvailabilitySchedule[],
    [experience.availabilitySchedules]
  );
  const locations = useMemo(() => experience.locations ?? [], [experience.locations]);
  const isVirtual = experience.experienceType === 'virtual' || experience.isVirtual === true;
  const isPresential = !isVirtual;
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
    const newSlots = getAvailableSlots(date, schedules, experience.duration ?? 60);
    setSlots(newSlots);
    setTime('');
  }, [date, schedules, experience.duration]);

  const canContinue = !!date && !!time && participants >= (experience.minCapacity ?? 1) &&
    (!isPresential || !hasLocations || !!locationId);

  const handleNext = () => {
    if (!date || !time) return;
    const loc = locations.find(l => l._id === locationId);
    onNext(date, time, participants, locationId, loc?.name);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <HiArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Fecha y hora</h2>
        <p className="text-xs text-[#F26726] font-semibold uppercase tracking-wide mt-1.5">{experience.title}</p>
      </div>

      <div className="space-y-6">
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
                onClick={() => setParticipants(p => Math.max(experience.minCapacity ?? 1, p - 1))}
                disabled={participants <= (experience.minCapacity ?? 1)}
                className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#F26726] hover:text-[#F26726] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
              >
                −
              </button>
              <span className="min-w-8 text-center text-lg font-bold text-gray-900">{participants}</span>
              <button
                type="button"
                onClick={() => setParticipants(p => Math.min(experience.capacity, p + 1))}
                disabled={participants >= experience.capacity}
                className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#F26726] hover:text-[#F26726] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
              >
                +
              </button>
            </div>
            <span className="text-xs text-gray-400 text-right">
              {experience.minCapacity ? `Mín. ${experience.minCapacity}` : ''}
              {experience.minCapacity ? <br /> : ''}
              Máx. {experience.capacity}
            </span>
          </div>
        </div>

        {/* Sede */}
        {isPresential && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">Sede</label>
            {hasMultipleLocations ? (
              <div className="space-y-2">
                {locations.map(loc => (
                  <button
                    key={loc._id}
                    type="button"
                    onClick={() => setLocationId(loc._id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                      locationId === loc._id
                        ? 'border-[#F26726] bg-orange-50 text-[#F26726] font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{loc.name}</span>
                    {formatAddress(loc.address) && <span className="text-gray-400 ml-2">— {formatAddress(loc.address)}</span>}
                  </button>
                ))}
              </div>
            ) : singleLocation ? (
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-200">
                <span className="font-medium">{singleLocation.name}</span>
                {formatAddress(singleLocation.address) && <span className="text-gray-400 ml-1">— {formatAddress(singleLocation.address)}</span>}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                Esta experiencia aún no tiene sedes configuradas. Podrás coordinar el lugar con el anfitrión.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-7 pt-6 border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!canContinue}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all ${
            canContinue
              ? 'bg-[#F26726] hover:bg-[#d9571f] text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuar <HiArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
