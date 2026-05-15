"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi';
import type { BookingData } from '@/app/book/[companyId]/page';

const schema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre completo'),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().min(7, 'Ingresa un teléfono válido'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: (guestInfo: BookingData['guestInfo']) => void;
  onBack: () => void;
}

export default function ContactStep({ onNext, onBack }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    onNext({ name: values.name, email: values.email, phone: values.phone, notes: values.notes });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <HiArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Tus datos de contacto</h2>
        <p className="text-sm text-gray-500 mt-1.5">El anfitrión usará esta información para confirmar tu reserva.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">Nombre completo *</label>
          <input
            {...register('name')}
            placeholder="Ej: María García"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#F26726] focus:ring-2 focus:ring-[#F26726]/20"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email *</label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@email.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#F26726] focus:ring-2 focus:ring-[#F26726]/20"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">Teléfono *</label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="+57 300 000 0000"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#F26726] focus:ring-2 focus:ring-[#F26726]/20"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1.5">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">Notas o requerimientos especiales</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Ej: alergias alimentarias, accesibilidad, celebraciones especiales..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#F26726] focus:ring-2 focus:ring-[#F26726]/20 resize-none"
          />
        </div>

        <div className="pt-4 mt-3 border-t border-gray-100">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#F26726] hover:bg-[#d9571f] text-white font-semibold text-base rounded-xl transition-colors shadow-sm"
          >
            Continuar <HiArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
