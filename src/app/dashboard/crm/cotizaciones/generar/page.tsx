"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Textarea } from 'flowbite-react';
import { HiArrowLeft, HiMail, HiCheckCircle } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { createQuote } from '@/lib/sanity/quoteService';
import { sendQuoteEmail } from '@/lib/email/quoteEmailService';
import { Experience } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface QuoteSessionData {
  searchParams: {
    date: string;
    time: string;
    guests: number;
    location?: string;
  };
  selectedExperiences: Experience[];
}

export default function GenerarCotizacionPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteSessionData | null>(null);
  
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    // Cargar datos de la sesión
    const savedData = sessionStorage.getItem('quoteData');
    if (savedData) {
      setQuoteData(JSON.parse(savedData));
    } else {
      showError('No hay datos de cotización. Vuelve a buscar experiencias.');
      router.push('/dashboard/crm/cotizaciones');
    }
  }, [router, showError]);

  const handleInputChange = (field: string, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotals = () => {
    if (!quoteData) return { subtotal: 0, total: 0 };

    const guests = quoteData.searchParams.guests;
    const subtotal = quoteData.selectedExperiences.reduce((sum, exp) => {
      return sum + (exp.basePrice * guests);
    }, 0);

    return { subtotal, total: subtotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !sanityUser || !quoteData) {
      showError('Error: Datos de usuario no disponibles');
      return;
    }

    if (!sanityUser.companyId) {
      showError('Debes tener una empresa configurada');
      return;
    }

    setIsLoading(true);

    try {
      // Crear cotización en Sanity
      const quote = await createQuote({
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        eventDate: quoteData.searchParams.date,
        eventTime: quoteData.searchParams.time,
        guests: quoteData.searchParams.guests,
        location: quoteData.searchParams.location,
        experiences: quoteData.selectedExperiences.map(exp => exp._id),
        notes: customerData.notes,
        companyId: sanityUser.companyId,
        hostId: sanityUser._id,
      });

      // Enviar email con la cotización
      await sendQuoteEmail({
        quoteId: quote._id,
        customerName: customerData.name,
        customerEmail: customerData.email,
        hostName: sanityUser.name || 'Anfitrión',
        companyName: sanityUser.companyId,
        experiences: quoteData.selectedExperiences,
        eventDate: quoteData.searchParams.date,
        eventTime: quoteData.searchParams.time,
        guests: quoteData.searchParams.guests,
        location: quoteData.searchParams.location,
        notes: customerData.notes,
        totals: calculateTotals(),
      });

      // Limpiar datos de sesión
      sessionStorage.removeItem('quoteData');

      showSuccess('Cotización enviada exitosamente al cliente');
      router.push('/dashboard/crm/cotizaciones');
    } catch (error) {
      console.error('Error generating quote:', error);
      showError('Error al generar y enviar la cotización');
    } finally {
      setIsLoading(false);
    }
  };

  if (!quoteData) {
    return null;
  }

  const { subtotal, total } = calculateTotals();

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              color="gray"
              onClick={() => router.back()}
              className="mr-4"
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Generar Cotización
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Completa los datos del cliente para enviar la cotización
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario del Cliente */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Datos del Cliente
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <TextInput
                      id="name"
                      type="text"
                      value={customerData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Juan Pérez"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <TextInput
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="cliente@ejemplo.com"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <TextInput
                      id="phone"
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas Adicionales</Label>
                    <Textarea
                      id="notes"
                      value={customerData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Información adicional relevante para la cotización..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                color="primary"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando Cotización...
                  </>
                ) : (
                  <>
                    <HiMail className="w-5 h-5 mr-2" />
                    Enviar Cotización por Email
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Resumen de la Cotización */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Resumen
              </h2>

              <div className="space-y-4">
                {/* Datos del Evento */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Datos del Evento
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-medium">Fecha:</span> {new Date(quoteData.searchParams.date).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Hora:</span> {quoteData.searchParams.time}</p>
                    <p><span className="font-medium">Personas:</span> {quoteData.searchParams.guests}</p>
                    {quoteData.searchParams.location && (
                      <p><span className="font-medium">Ubicación:</span> {quoteData.searchParams.location}</p>
                    )}
                  </div>
                </div>

                {/* Experiencias Seleccionadas */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Experiencias ({quoteData.selectedExperiences.length})
                  </h3>
                  <div className="space-y-3">
                    {quoteData.selectedExperiences.map((exp) => (
                      <div key={exp._id} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                          {exp.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {exp.duration} min • {exp.capacity} personas máx
                        </p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            ${exp.basePrice.toLocaleString()} × {quoteData.searchParams.guests}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            ${(exp.basePrice * quoteData.searchParams.guests).toLocaleString()} {exp.currency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="pt-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${subtotal.toLocaleString()} COP
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-900 dark:text-gray-100">Total:</span>
                    <span className="text-[#F26726]">
                      ${total.toLocaleString()} COP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}



