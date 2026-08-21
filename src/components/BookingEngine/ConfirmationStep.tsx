"use client";

import React from 'react';
import { HiArrowLeft, HiCalendar, HiUsers, HiLocationMarker, HiMail, HiPhone, HiVideoCamera } from 'react-icons/hi';
import type { BookingData } from '@/app/book/[slug]/page';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

function formatPrice(price: number, currency: string) {
  return price.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
}

interface Props {
  booking: BookingData;
  /** La plataforma cobra en linea. Cambia lo que se promete bajo el total. */
  cobraEnLinea: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function ConfirmationStep({ booking, cobraEnLinea, submitting, onConfirm, onBack }: Props) {
  const { experience, date, time, participants, locationName, selectedAddons, guestInfo } = booking;
  const subtotal = experience.basePrice * participants;
  const addonsTotal = selectedAddons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
  const total = subtotal + addonsTotal;
  const formattedDate = format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  const rows = [
    {
      icon: <HiCalendar className="w-4 h-4 text-[#F26726]" />,
      label: 'Fecha y hora',
      value: `${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}, ${time}`,
    },
    {
      icon: <HiUsers className="w-4 h-4 text-[#F26726]" />,
      label: 'Personas',
      value: `${participants} persona${participants > 1 ? 's' : ''}`,
    },
    ...(experience.experienceType !== 'virtual' && locationName ? [{
      icon: <HiLocationMarker className="w-4 h-4 text-[#F26726]" />,
      label: 'Sede',
      value: locationName,
    }] : []),
    ...(experience.experienceType === 'virtual' ? [{
      icon: <HiVideoCamera className="w-4 h-4 text-[#F26726]" />,
      label: 'Modalidad',
      value: 'Virtual',
    }] : []),
    {
      icon: <HiMail className="w-4 h-4 text-[#F26726]" />,
      label: 'Email',
      value: guestInfo.email,
    },
    {
      icon: <HiPhone className="w-4 h-4 text-[#F26726]" />,
      label: 'Teléfono',
      value: guestInfo.phone,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <HiArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Resumen de la reserva</h2>
        <p className="text-sm text-gray-500 mt-1.5">Revisa los detalles antes de confirmar.</p>
      </div>

      {/* Experiencia */}
      <div className="bg-orange-50 rounded-xl px-4 py-3.5 mb-5 border border-orange-100">
        <p className="text-xs text-[#F26726] font-semibold uppercase tracking-wide mb-1">Experiencia</p>
        <p className="text-base font-bold text-gray-900">{experience.title}</p>
      </div>

      {/* Detalles */}
      <div className="divide-y divide-gray-100 mb-5 border-y border-gray-100">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <div className="flex-shrink-0 mt-0.5">{row.icon}</div>
            <span className="text-sm text-gray-500 w-20 sm:w-24 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-medium text-gray-900 flex-1 break-words">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Precio */}
      <div className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            {formatPrice(experience.basePrice, experience.currency)} × {participants} persona{participants > 1 ? 's' : ''}
          </span>
          <span className="text-sm text-gray-700">{formatPrice(subtotal, experience.currency)}</span>
        </div>
        {selectedAddons && selectedAddons.length > 0 && (
          <div className="space-y-1.5 pt-2 mt-2 border-t border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Adiciones</p>
            {selectedAddons.map((a, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {a.name}
                  {a.priceType === 'per_person' && a.quantity > 1 && (
                    <span className="text-gray-400"> ({a.quantity} × {formatPrice(a.price, experience.currency)})</span>
                  )}
                </span>
                <span className="text-sm text-gray-700">{formatPrice(a.price * a.quantity, experience.currency)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-3">
          <span className="text-sm font-bold text-gray-900">Total estimado</span>
          <span className="text-xl font-bold text-[#334C5D]">{formatPrice(total, experience.currency)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {cobraEnLinea
            ? '* Al confirmar podrás pagar en línea de forma segura.'
            : '* Precio referencial. El pago se gestiona directamente con el anfitrión.'}
        </p>
      </div>

      <div className="pt-5 border-t border-gray-100">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
            submitting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#F26726] hover:bg-[#d9571f] text-white shadow-sm'
          }`}
        >
          {submitting ? 'Enviando reserva...' : 'Confirmar reserva'}
        </button>
      </div>
    </div>
  );
}
