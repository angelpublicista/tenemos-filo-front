"use client";

import React, { useState, useEffect } from 'react';
import { Experience, Location, AvailabilitySchedule } from '@/types';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getAvailabilityScheduleById } from '@/lib/sanity/availabilityService';
import { createReservationManually } from '@/lib/sanity/reservationService';
import { searchExperiencesForQuote } from '@/lib/sanity/quoteService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { AiOutlineClose, AiOutlineUser, AiOutlineUserAdd } from 'react-icons/ai';
import { BiTime, BiMap } from 'react-icons/bi';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useAuth } from '@/lib/firebase/AuthContext';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-custom.css';
import { es } from 'date-fns/locale/es';

// Registrar locale en español
registerLocale('es', es);

interface CreateReservationModalProps {
  experiences: Experience[];
  onClose: () => void;
  onReservationCreated: () => void;
}

type ClientType = 'guest' | 'registered';

// Tipo extendido para experiencias con datos expandidos
type ExpandedExperience = Omit<Experience, 'locations' | 'availabilities'> & {
  locations?: Location[] | Array<{ _ref: string; _type: 'reference' }>;
  availabilitySchedules?: AvailabilitySchedule[];
  availabilities?: Array<{ _ref: string; _type: 'reference' }>;
};

const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
  experiences,
  onClose,
  onReservationCreated,
}) => {
  const { sanityUser } = useAuth();
  const [step, setStep] = useState(0); // Ahora empieza en 0 (búsqueda)
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, showLoading, hideLoading } = useSweetAlert();

  // Paso 0: Búsqueda de experiencias
  const [isSearching, setIsSearching] = useState(false);
  const [searchData, setSearchData] = useState({
    date: '',
    time: '',
    guests: 1,
  });
  const [searchResults, setSearchResults] = useState<ExpandedExperience[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number; quantity: number; priceType: string }>>([]);

  // Cargar sedes y calendario cuando se selecciona una experiencia
  useEffect(() => {
    const loadLocationData = async () => {
      if (!selectedExperience) return;

      try {
        // Obtener la experiencia seleccionada de los resultados de búsqueda o props
        const experience = (searchResults.find(exp => exp._id === selectedExperience) || 
                          experiences.find(exp => exp._id === selectedExperience)) as ExpandedExperience;
        
        if (!experience) return;

        // Las sedes ahora vienen expandidas en la experiencia desde la query
        if (experience.locations && Array.isArray(experience.locations)) {
          // Verificar si ya vienen expandidas o son solo referencias
          const firstLocation = experience.locations[0];
          if (firstLocation && typeof firstLocation === 'object' && '_id' in firstLocation) {
            // Ya vienen expandidas
            setLocations(experience.locations as Location[]);
          } else {
            // Son referencias, necesitamos cargarlas (fallback)
            const locationsData = await getLocationsByCompany(sanityUser?.companyId || '');
            setLocations(locationsData || []);
          }
        } else {
          setLocations([]);
        }

        // Cargar los calendarios de disponibilidad de la experiencia
        if (experience.availabilitySchedules && Array.isArray(experience.availabilitySchedules)) {
          // Los calendarios ya vienen expandidos desde la query
          setAvailableSchedules(experience.availabilitySchedules);
        } else if (experience.availabilities && Array.isArray(experience.availabilities)) {
          // Fallback si vienen como referencias
          const schedules: AvailabilitySchedule[] = [];
          for (const availRef of experience.availabilities) {
            const ref = availRef as { _ref: string };
            if (ref._ref) {
              const schedule = await getAvailabilityScheduleById(ref._ref);
              if (schedule) schedules.push(schedule);
            }
          }
          setAvailableSchedules(schedules);
        } else {
          setAvailableSchedules([]);
        }
      } catch (error) {
        console.error('Error loading locations and availability:', error);
      }
    };

    loadLocationData();
  }, [selectedExperience, searchResults, experiences, sanityUser]);

  // El calendario ahora se carga desde la experiencia, no desde la sede
  // Este useEffect ya no es necesario porque el calendario se obtiene en el useEffect anterior

  // Actualizar cantidades de addons cuando cambian los participantes
  useEffect(() => {
    if (selectedAddons.length > 0) {
      setSelectedAddons(selectedAddons.map(addon => ({
        ...addon,
        quantity: addon.priceType === 'per_person' ? participants : 1
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

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

      // Obtener el calendario de disponibilidad de la experiencia
      const selectedExp = searchResults.find(exp => exp._id === selectedExperience) || 
                         experiences.find(exp => exp._id === selectedExperience);
      
      // Combinar todos los slots de todos los calendarios disponibles
      const allSlots: Set<string> = new Set();

      if (availableSchedules.length === 0) {
        // Si no hay calendarios válidos, usar horario predeterminado
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
      const dayOfWeek = daysOfWeek[date.getDay()];
      const experienceDuration = selectedExp?.duration || 60;

      // Procesar cada calendario y combinar los slots disponibles
      availableSchedules.forEach(schedule => {
        if (!schedule.weeklySchedule) return;
        
        const daySchedule = schedule.weeklySchedule[dayOfWeek];
        
        if (!daySchedule || !daySchedule.isActive || !daySchedule.timeSlots) return;

        // Generar slots de tiempo basados en los timeSlots del día
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
            allSlots.add(timeString);
          }
        });
      });

      // Convertir Set a Array y ordenar
      const slotsArray = Array.from(allSlots).sort();
      setAvailableTimeSlots(slotsArray);
    };

    getAvailableSlots();
  }, [selectedExperience, selectedDate, availableSchedules, searchResults, experiences]);

  // Función para buscar experiencias disponibles
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sanityUser?.companyId) {
      showError('Debes tener una empresa configurada');
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      const results = await searchExperiencesForQuote({
        companyId: sanityUser.companyId,
        date: searchData.date,
        time: searchData.time,
        guests: searchData.guests,
      });

      setSearchResults(results as ExpandedExperience[]);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching experiences:', error);
      showError('Error al buscar experiencias disponibles');
    } finally {
      setIsSearching(false);
    }
  };

  // Seleccionar experiencia y pasar al siguiente paso
  const handleSelectExperience = (experience: ExpandedExperience) => {
    setSelectedExperience(experience._id);
    setSelectedDate(searchData.date);
    setSelectedTime(searchData.time);
    setParticipants(searchData.guests);
    
    // Encontrar y seleccionar la ubicación automáticamente si está disponible
    if (experience.presentialLocation) {
      setSelectedLocation(experience.presentialLocation);
    }
    
    setStep(1); // Pasar al siguiente paso
  };

  const selectedExp = searchResults.find(exp => exp._id === selectedExperience) || experiences.find(exp => exp._id === selectedExperience);

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

      const reservationDateTime = `${selectedDate}T${selectedTime}:00`;
      
      console.log('📝 Datos de la reserva a crear:', {
        experience: selectedExperience,
        location: selectedLocation,
        reservationDate: reservationDateTime,
        participants,
        clientType,
        guestInfo: clientType === 'guest' ? {
          name: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
        } : undefined,
      });

      const result = await createReservationManually({
        experience: selectedExperience,
        location: selectedLocation,
        reservationDate: reservationDateTime,
        participants,
        specialRequests: specialRequests.trim() || undefined,
        clientType,
        source: 'manual',
        guestInfo: clientType === 'guest' ? {
          name: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
        } : undefined,
        selectedAddons: selectedAddons.length > 0 ? selectedAddons : undefined,
      });

      console.log('✅ Reserva creada con éxito:', result);

      hideLoading();
      showSuccess('Reserva creada exitosamente');
      onReservationCreated();
      onClose();
    } catch (error) {
      hideLoading();
      console.error('❌ Error completo al crear la reserva:', error);
      showError(error instanceof Error ? error.message : 'Error al crear la reserva');
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
                {step === 0 ? 'Buscar Experiencia Disponible' : `Paso ${step} de 2`}
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
          <form onSubmit={step === 0 ? handleSearch : handleSubmit} className="space-y-6">
            {/* Paso 0: Búsqueda de Experiencias */}
            {step === 0 && (
              <>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Datos del Evento
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Ingresa los detalles del evento para buscar experiencias disponibles
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha del Evento *
                        </label>
                        <DatePicker
                          selected={searchData.date ? new Date(searchData.date + 'T12:00:00') : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setSearchData(prev => ({ ...prev, date: `${year}-${month}-${day}` }));
                            }
                          }}
                          minDate={new Date()}
                          dateFormat="EEEE, dd 'de' MMMM 'de' yyyy"
                          locale="es"
                          placeholderText="Selecciona la fecha"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent text-sm"
                          wrapperClassName="w-full"
                          showPopperArrow={false}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora Aproximada *
                        </label>
                        <input
                          type="time"
                          value={searchData.time}
                          onChange={(e) => setSearchData(prev => ({ ...prev, time: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Personas *
                      </label>
                      <input
                        type="number"
                        value={searchData.guests}
                        onChange={(e) => setSearchData(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching}
                      className="w-full px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isSearching ? 'Buscando...' : 'Buscar Experiencias Disponibles'}
                    </button>
                  </div>
                </div>

                {/* Resultados de Búsqueda */}
                {hasSearched && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Experiencias Disponibles ({searchResults.length})
                    </h3>

                    {searchResults.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">
                          No se encontraron experiencias disponibles para estos criterios.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Intenta ajustar la fecha, número de personas o ubicación.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {searchResults.map((exp) => (
                          <div
                            key={exp._id}
                            className="border-2 border-gray-200 hover:border-[#F26726] rounded-lg p-4 transition-all cursor-pointer"
                            onClick={() => handleSelectExperience(exp)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-[#334C5D] mb-2">{exp.title}</h4>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{exp.description}</p>
                                
                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                                  <div className="flex items-center gap-1">
                                    <BiTime className="w-3 h-3" />
                                    {exp.duration} min
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <BiMap className="w-3 h-3" />
                                    {exp.experienceType === 'presential' ? 'Presencial' : 
                                     exp.experienceType === 'virtual' ? 'Virtual' : 'Híbrida'}
                                  </div>
                                  <div>Capacidad: {exp.minCapacity || 1}-{exp.capacity} personas</div>
                                  {exp.presentialCity && <div>📍 {exp.presentialCity}</div>}
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm">
                                    <span className="text-gray-600">Precio por persona: </span>
                                    <span className="font-semibold text-gray-900">
                                      ${exp.basePrice.toLocaleString()} {exp.currency}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">Total ({searchData.guests} personas):</div>
                                    <div className="text-lg font-bold text-[#F26726]">
                                      ${(exp.basePrice * searchData.guests).toLocaleString()} {exp.currency}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleSelectExperience(exp)}
                              className="mt-3 w-full px-4 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors font-medium"
                            >
                              Seleccionar esta Experiencia
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                {/* Experiencia Seleccionada */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Detalles de la Reserva
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Mostrar experiencia seleccionada */}
                    {selectedExp && (
                      <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-[#F26726] p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-[#334C5D] text-lg mb-1">{selectedExp.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{selectedExp.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(0);
                              setSelectedExperience('');
                            }}
                            className="text-xs text-[#F26726] hover:underline font-medium"
                          >
                            Cambiar
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <BiTime className="text-gray-500" />
                            <span className="text-gray-700">{selectedExp.duration} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BiMap className="text-gray-500" />
                            <span className="text-gray-700">
                              {selectedExp.experienceType === 'presential' ? 'Presencial' : 
                               selectedExp.experienceType === 'virtual' ? 'Virtual' : 'Híbrida'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#F26726]">
                              ${selectedExp.basePrice.toLocaleString()} {selectedExp.currency}
                            </span>
                            <span className="text-xs text-gray-600 block">por persona</span>
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
                              Esta experiencia no tiene sedes configuradas.
                            </p>
                          )}
                        </div>

                        {selectedLocation && availableSchedules.length === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                              Esta experiencia no tiene calendarios de disponibilidad configurados. Los horarios estarán disponibles sin restricciones.
                            </p>
                          </div>
                        )}

                        {/* Información del evento (prellenada desde búsqueda) */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-[#334C5D] mb-3">Datos del Evento</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Fecha:</span>
                              <div className="font-semibold text-gray-900">
                                {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Hora:</span>
                              <div className="font-semibold text-gray-900">{selectedTime}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Participantes:</span>
                              <div className="font-semibold text-gray-900">{participants} personas</div>
                            </div>
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={() => setStep(0)}
                                className="text-xs text-[#F26726] hover:underline font-medium"
                              >
                                Cambiar datos del evento
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Servicios Adicionales */}
                        {selectedExp && selectedExp.addons && selectedExp.addons.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 text-left">
                              Servicios Adicionales (Opcional)
                            </label>
                            <div className="space-y-2">
                              {selectedExp.addons.map((addon, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-[#F26726] transition-colors">
                                  <div className="flex items-center gap-3 flex-1">
                                    <input
                                      type="checkbox"
                                      id={`addon-${index}`}
                                      checked={selectedAddons.some(a => a.name === addon.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedAddons([...selectedAddons, {
                                            name: addon.name,
                                            price: addon.price,
                                            quantity: addon.priceType === 'per_person' ? participants : 1,
                                            priceType: addon.priceType
                                          }]);
                                        } else {
                                          setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
                                        }
                                      }}
                                      className="w-4 h-4 text-[#F26726] focus:ring-[#F26726] rounded"
                                    />
                                    <label htmlFor={`addon-${index}`} className="flex-1 cursor-pointer">
                                      <div className="font-medium text-gray-900">{addon.name}</div>
                                      {addon.description && (
                                        <div className="text-xs text-gray-500">{addon.description}</div>
                                      )}
                                    </label>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-[#F26726]">
                                      +${addon.price.toLocaleString()} {selectedExp.currency}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {addon.priceType === 'per_person' ? 'por persona' : 'precio total'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                          {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} {selectedTime && `a las ${selectedTime}`}
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
                      
                      {/* Desglose de precios */}
                      <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal ({participants} {participants === 1 ? 'persona' : 'personas'}):</span>
                          <span>${(selectedExp.basePrice * participants).toLocaleString()} {selectedExp.currency}</span>
                        </div>
                        
                        {selectedAddons.length > 0 && (
                          <>
                            {selectedAddons.map((addon, idx) => (
                              <div key={idx} className="flex justify-between text-gray-600 text-xs">
                                <span>+ {addon.name} ({addon.priceType === 'per_person' ? `${participants}x` : '1x'})</span>
                                <span>${(addon.price * addon.quantity).toLocaleString()} {selectedExp.currency}</span>
                              </div>
                            ))}
                          </>
                        )}
                        
                        <div className="border-t border-gray-300 pt-2 flex justify-between">
                          <span className="text-gray-700 font-bold">Total:</span>
                          <span className="font-bold text-[#F26726] text-lg">
                            ${(
                              (selectedExp.basePrice * participants) + 
                              selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
                            ).toLocaleString()} {selectedExp.currency}
                          </span>
                        </div>
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
            {step > 0 && (
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
            {step === 0 ? (
              // El botón de búsqueda está dentro del form
              null
            ) : step === 1 ? (
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

