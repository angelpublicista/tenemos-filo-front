"use client";

import React, { useState, useEffect } from 'react';
import { Experience, Location, AvailabilitySchedule } from '@/types';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getAvailabilitySchedulesByLocation } from '@/lib/sanity/availabilityService';
import { createReservationManually } from '@/lib/sanity/reservationService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { AiOutlineClose, AiOutlineUser, AiOutlineUserAdd } from 'react-icons/ai';
import { BiTime, BiMap } from 'react-icons/bi';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useAuth } from '@/lib/firebase/AuthContext';

interface CreateReservationModalProps {
  experiences: Experience[];
  onClose: () => void;
  onReservationCreated: () => void;
}

type ClientType = 'guest' | 'registered';

const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
  experiences,
  onClose,
  onReservationCreated,
}) => {
  const { sanityUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, showLoading, hideLoading } = useSweetAlert();

  // Datos de la reserva
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [participants, setParticipants] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  // Datos del cliente
  const [clientType, setClientType] = useState<ClientType>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Datos adicionales
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<AvailabilitySchedule[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Cargar sedes cuando se selecciona una experiencia
  useEffect(() => {
    const loadLocationData = async () => {
      if (!selectedExperience || !sanityUser?.companyId) return;

      try {
        const locationsData = await getLocationsByCompany(sanityUser.companyId);
        setLocations(locationsData || []);
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    loadLocationData();
  }, [selectedExperience, sanityUser]);

  // Cargar calendarios cuando se selecciona una sede
  useEffect(() => {
    const loadSchedules = async () => {
      if (!selectedLocation) {
        setAvailableSchedules([]);
        return;
      }

      try {
        const schedules = await getAvailabilitySchedulesByLocation(selectedLocation);
        setAvailableSchedules(schedules || []);
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    };

    loadSchedules();
  }, [selectedLocation]);

  // Obtener slots disponibles según la experiencia y el día seleccionado
  useEffect(() => {
    const getAvailableSlots = () => {
      if (!selectedExperience || !selectedDate) {
        setAvailableTimeSlots([]);
        return;
      }

      // Si no hay calendarios, permitir cualquier hora (horario completo)
      if (availableSchedules.length === 0) {
        const defaultSlots: string[] = [];
        for (let hour = 8; hour <= 20; hour++) {
          defaultSlots.push(`${hour.toString().padStart(2, '0')}:00`);
          defaultSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        setAvailableTimeSlots(defaultSlots);
        return;
      }

      // Obtener el calendario de la experiencia o el principal
      const selectedExp = experiences.find(exp => exp._id === selectedExperience);
      let schedule = availableSchedules.find(s => s.isMain && s.isActive);
      
      // Si la experiencia tiene un calendario asociado, usarlo
      if (selectedExp?.availabilitySchedule) {
        const expSchedule = availableSchedules.find(s => s._id === selectedExp.availabilitySchedule);
        if (expSchedule) {
          schedule = expSchedule;
        }
      }

      if (!schedule) {
        // Si no hay calendario válido, usar horario predeterminado
        const defaultSlots: string[] = [];
        for (let hour = 8; hour <= 20; hour++) {
          defaultSlots.push(`${hour.toString().padStart(2, '0')}:00`);
          defaultSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        setAvailableTimeSlots(defaultSlots);
        return;
      }

      // Obtener el día de la semana de la fecha seleccionada
      const date = new Date(selectedDate);
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const dayOfWeek = daysOfWeek[date.getDay()] as keyof typeof schedule.weeklySchedule;

      const daySchedule = schedule.weeklySchedule[dayOfWeek];
      
      if (!daySchedule || !daySchedule.isActive) {
        setAvailableTimeSlots([]);
        return;
      }

      // Generar slots de tiempo basados en los timeSlots del día
      const slots: string[] = [];
      const experienceDuration = selectedExp?.duration || 60;
      
      daySchedule.timeSlots.forEach((timeSlot: { startTime: string; endTime: string }) => {
        const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        // Generar slots cada 30 minutos dentro del rango
        for (let minutes = startMinutes; minutes + experienceDuration <= endMinutes; minutes += 30) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      });

      setAvailableTimeSlots(slots);
    };

    getAvailableSlots();
  }, [selectedExperience, selectedDate, availableSchedules, experiences]);

  const selectedExp = experiences.find(exp => exp._id === selectedExperience);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!selectedExperience) {
      showError('Por favor selecciona una experiencia');
      return;
    }

    if (!selectedLocation) {
      showError('Por favor selecciona una sede');
      return;
    }

    if (!selectedDate || !selectedTime) {
      showError('Por favor selecciona fecha y hora');
      return;
    }

    if (clientType === 'guest') {
      if (!guestName.trim()) {
        showError('Por favor ingresa el nombre del invitado');
        return;
      }
      if (!guestEmail.trim()) {
        showError('Por favor ingresa el email del invitado');
        return;
      }
      if (!guestPhone.trim()) {
        showError('Por favor ingresa el teléfono del invitado');
        return;
      }
    }

    try {
      setSaving(true);
      showLoading('Creando reserva...');

      const reservationDateTime = `${selectedDate}T${selectedTime}:00Z`;

      await createReservationManually({
        experience: selectedExperience,
        location: selectedLocation,
        reservationDate: reservationDateTime,
        participants,
        specialRequests: specialRequests.trim() || undefined,
        clientType,
        guestInfo: clientType === 'guest' ? {
          name: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
        } : undefined,
      });

      hideLoading();
      showSuccess('Reserva creada exitosamente');
      onReservationCreated();
    } catch (error) {
      hideLoading();
      showError('Error al crear la reserva');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#334C5D]">
                Nueva Reserva Manual
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Paso {step} de 2
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <AiOutlineClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                {/* Selección de Experiencia */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Detalles de la Reserva
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                        Experiencia *
                      </label>
                      <select
                        value={selectedExperience}
                        onChange={(e) => setSelectedExperience(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                        required
                      >
                        <option value="">Selecciona una experiencia</option>
                        {experiences.filter(exp => exp.status === 'active').map((exp) => (
                          <option key={exp._id} value={exp._id}>
                            {exp.title} - ${exp.basePrice.toLocaleString()} {exp.currency}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedExp && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <BiTime className="text-gray-500" />
                            <span className="text-gray-700">{selectedExp.duration} minutos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BiMap className="text-gray-500" />
                            <span className="text-gray-700">
                              {selectedExp.experienceType === 'presential' ? 'Presencial' : 
                               selectedExp.experienceType === 'virtual' ? 'Virtual' : 'Híbrida'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                        {selectedExperience && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                            Sede *
                          </label>
                          <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                            required
                          >
                            <option value="">Selecciona una sede</option>
                            {locations.map((loc) => (
                              <option key={loc._id} value={loc._id}>
                                {loc.name} - {loc.address.city}
                              </option>
                            ))}
                          </select>
                          {locations.length === 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              No hay sedes disponibles. 
                              <a href="/dashboard/locations" className="text-[#F26726] hover:underline ml-1">
                                Crear una sede
                              </a>
                            </p>
                          )}
                        </div>

                        {selectedLocation && availableSchedules.length === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                              Esta sede no tiene calendarios de disponibilidad. Los horarios estarán disponibles sin restricciones.
                              <a href="/dashboard/availability" className="text-[#F26726] hover:underline ml-1">
                                Configurar calendarios
                              </a>
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                              Fecha *
                            </label>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              min={getMinDate()}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                              Hora *
                            </label>
                            {availableTimeSlots.length > 0 ? (
                              <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                                required
                              >
                                <option value="">Selecciona una hora</option>
                                {availableTimeSlots.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            ) : selectedDate && selectedLocation ? (
                              <div className="w-full px-4 py-2 border border-red-300 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-700">
                                  No hay horarios disponibles para este día
                                </p>
                              </div>
                            ) : (
                              <input
                                type="time"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                                disabled
                                placeholder="Selecciona primero una fecha"
                              />
                            )}
                            {availableTimeSlots.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {availableTimeSlots.length} horarios disponibles
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                            Número de Participantes *
                          </label>
                          <input
                            type="number"
                            value={participants}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setParticipants(0);
                              } else {
                                setParticipants(parseInt(value));
                              }
                            }}
                            min={selectedExp?.minCapacity || 1}
                            max={selectedExp?.capacity || 100}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                            required
                          />
                          {selectedExp && (
                            <p className="text-xs text-gray-500 mt-1">
                              Capacidad: {selectedExp.minCapacity || 1} - {selectedExp.capacity} personas
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                            Solicitudes Especiales
                          </label>
                          <textarea
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                            placeholder="Alergias, preferencias, etc..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Información del Cliente */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información del Cliente
                  </h3>

                  {/* Tipo de Cliente */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-left">
                      Tipo de Cliente
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setClientType('guest')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          clientType === 'guest'
                            ? 'border-[#F26726] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <AiOutlineUserAdd className="text-3xl mx-auto mb-2 text-[#F26726]" />
                        <div className="font-medium text-gray-900">Invitado</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Cliente sin cuenta en la plataforma
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientType('registered')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          clientType === 'registered'
                            ? 'border-[#F26726] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <AiOutlineUser className="text-3xl mx-auto mb-2 text-[#F26726]" />
                        <div className="font-medium text-gray-900">Registrado</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Cliente con cuenta existente
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Formulario para invitado */}
                  {clientType === 'guest' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                          placeholder="Nombre del invitado"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                          placeholder="correo@ejemplo.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                          Teléfono *
                        </label>
                        <PhoneInput
                          defaultCountry="co"
                          value={guestPhone}
                          onChange={(phone) => setGuestPhone(phone)}
                          placeholder="Teléfono"
                          className="w-full [&>input]:w-full [&>input]:px-4 [&>input]:py-2 [&>input]:border [&>input]:border-gray-300 [&>input]:rounded-lg [&>input]:focus:ring-2 [&>input]:focus:ring-[#F26726] [&>input]:focus:border-transparent [&>button]:border [&>button]:border-gray-300 [&>button]:rounded-l-lg [&>button]:bg-white [&>button]:hover:bg-gray-50"
                        />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Nota:</strong> Este cliente se registrará como invitado. No necesitará crear una cuenta para asistir a la experiencia.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Formulario para cliente registrado */}
                  {clientType === 'registered' && (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Próximamente:</strong> Podrás buscar y seleccionar clientes registrados en la plataforma.
                          Por ahora, usa la opción &quot;Invitado&quot; para crear reservas manuales.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen de la Reserva */}
                {selectedExp && clientType === 'guest' && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Resumen de la Reserva</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Experiencia:</span>
                        <span className="font-medium text-gray-900">{selectedExp.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium text-gray-900">
                          {selectedDate && new Date(selectedDate).toLocaleDateString('es-CO')} {selectedTime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Participantes:</span>
                        <span className="font-medium text-gray-900">{participants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cliente:</span>
                        <span className="font-medium text-gray-900">{guestName || 'Invitado'}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                        <span className="text-gray-700 font-medium">Total:</span>
                        <span className="font-bold text-[#F26726] text-lg">
                          ${(selectedExp.basePrice * participants).toLocaleString()} {selectedExp.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Anterior
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            {step === 1 ? (
              <button
                onClick={() => {
                  if (!selectedExperience || !selectedLocation || !selectedDate || !selectedTime) {
                    showError('Por favor completa todos los campos obligatorios');
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
                disabled={saving}
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Creando...' : 'Crear Reserva'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReservationModal;

