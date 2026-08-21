"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Select, Badge, Modal, ModalHeader, ModalBody, Tooltip } from 'flowbite-react';
import CalendarPicker from '@/components/CalendarPicker';
import TimePicker from '@/components/TimePicker';
import { 
  HiEye, 
  HiPencilAlt,
  HiCheckCircle,
  HiExclamationCircle,
  HiViewGrid,
  HiViewList,
  HiCalendar,
  HiUsers,
  HiCurrencyDollar,
  HiClock,
  HiPhone,
  HiMail,
  HiLocationMarker,
  HiVideoCamera,
  HiChevronLeft,
  HiChevronRight,
  HiPlus,
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useAuth } from '@/lib/auth/AuthContext';
import { getExperiencesByCompany } from '@/lib/sanity/experienceService';
import { getReservationsByCompany, updateReservationStatus, updateReservationInSanity } from '@/lib/sanity/reservationService';
import { Experience, Reservation } from '@/types';
import CreateReservationModal from '@/components/CreateReservationModal';
import { SkeletonStatCard, SkeletonCard } from '@/components/Skeleton';

interface ReservationStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  totalRevenue: number;
  totalParticipants: number;
  averageParticipants: number;
  pendingPayments: number;
  paidReservations: number;
}

export default function ReservationsPage() {
  const { sanityUser } = useAuth();
  const { showSuccess, showError } = useSweetAlert();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<Partial<Reservation>[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      setShowCreateModal(true);
      router.replace('/dashboard/reservations');
    }
  }, [searchParams, router]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReservationStats>({
    total: 0, pending: 0, confirmed: 0, inProgress: 0,
    completed: 0, cancelled: 0, noShow: 0, rescheduled: 0,
    totalRevenue: 0, totalParticipants: 0, averageParticipants: 0,
    pendingPayments: 0, paidReservations: 0,
  });
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date()); // Fecha actual (Hoy)

  // Estados para el calendario
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  // Estados para edición de reserva
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<(Partial<Reservation> & { editDate?: string; editTime?: string }) | null>(null);

  // Función para cargar reservas reales
  const loadReservations = async () => {
    if (!sanityUser?.companyId) return;
    
    try {
      console.log('📅 Cargando reservas de la empresa:', sanityUser.companyId);
      
      const realReservations = await getReservationsByCompany(sanityUser.companyId);
      console.log('✅ Reservas cargadas:', realReservations);
      
      // Si hay reservas reales, usarlas; si no, usar mock para demo
      if (realReservations && realReservations.length > 0) {
        setReservations(realReservations);
        
        // Actualizar estadísticas con datos reales
        setStats({
          total: realReservations.length,
          pending: realReservations.filter(r => r.status === 'pending').length,
          confirmed: realReservations.filter(r => r.status === 'confirmed').length,
          inProgress: realReservations.filter(r => r.status === 'in_progress').length,
          completed: realReservations.filter(r => r.status === 'completed').length,
          cancelled: realReservations.filter(r => r.status === 'cancelled').length,
          noShow: realReservations.filter(r => r.status === 'no_show').length,
          rescheduled: realReservations.filter(r => r.status === 'rescheduled').length,
          totalRevenue: realReservations.reduce((sum, r) => sum + (r.pricing?.total || 0), 0),
          totalParticipants: realReservations.reduce((sum, r) => sum + r.participants, 0),
          averageParticipants: realReservations.reduce((sum, r) => sum + r.participants, 0) / realReservations.length || 0,
          pendingPayments: realReservations.filter(r => r.paymentStatus === 'pending').length,
          paidReservations: realReservations.filter(r => r.paymentStatus === 'paid').length,
        });
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  // Cargar experiencias y reservas de la empresa
  useEffect(() => {
    const loadData = async () => {
      if (!sanityUser?.companyId) {
        setIsLoading(false);
        return;
      }

      try {
        const experiencesData = await getExperiencesByCompany(sanityUser.companyId);
        setExperiences(experiencesData || []);

        // Cargar reservas
        await loadReservations();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanityUser]);

  // Funciones para el calendario
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getReservationsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(reservation => 
      reservation.reservationDate?.split('T')[0] === dateStr
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (calendarView === 'month') {
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      } else if (calendarView === 'week') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else if (calendarView === 'day') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
      }
      return newDate;
    });
  };

  const formatDateHeader = (date: Date) => {
    if (calendarView === 'month') {
      return date.toLocaleDateString('es-CO', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (calendarView === 'week') {
      const weekDays = getWeekDays(date);
      const startDate = weekDays[0];
      const endDate = weekDays[6];
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    } else if (calendarView === 'day') {
      return date.toLocaleDateString('es-CO', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return '';
  };

  const getDayNames = () => {
    return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColorBadge = (status?: string) => {
    if (!status) return 'gray';
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'failure';
      case 'no_show': return 'failure';
      case 'rescheduled': return 'info';
      default: return 'gray';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper para obtener info del cliente
  const getClientName = (reservation: Partial<Reservation>): string => {
    return reservation.clientInfo?.name || reservation.client?.name || 'Cliente sin nombre';
  };

  const getClientEmail = (reservation: Partial<Reservation>): string => {
    return reservation.clientInfo?.email || reservation.client?.email || '—';
  };

  const getClientPhone = (reservation: Partial<Reservation>): string => {
    return reservation.clientInfo?.phone || reservation.client?.phone || '—';
  };

  // Helper para obtener tipo de experiencia (maneja diferencias entre mock y datos reales)
  const getExperienceType = (reservation: Partial<Reservation>): 'virtual' | 'presential' | 'hybrid' | undefined => {
    const exp = reservation.experience as { experienceType?: 'virtual' | 'presential' | 'hybrid' };
    return exp?.experienceType;
  };

  // Funciones para vista de semana
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Domingo = 0, ajustamos para que la semana empiece el lunes
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Funciones para vista de día
  const getHourSlots = () => {
    const hours = [];
    for (let i = 6; i < 23; i++) {
      hours.push(i);
    }
    return hours;
  };

  const getReservationsForTimeSlot = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(reservation => {
      if (!reservation.reservationDate) return false;
      const reservationDate = new Date(reservation.reservationDate);
      const reservationHour = reservationDate.getHours();
      const reservationDateStr = reservation.reservationDate.split('T')[0];
      return reservationDateStr === dateStr && reservationHour === hour;
    });
  };

  // Verificar si la fecha seleccionada es hoy
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Verificar si estamos viendo el día actual en cualquier vista
  const isViewingToday = () => {
    const today = new Date();
    
    if (calendarView === 'day') {
      // En vista de día, solo es "hoy" si la fecha seleccionada es hoy
      return currentDate.toDateString() === today.toDateString();
    } else if (calendarView === 'week') {
      // En vista de semana, es "hoy" si estamos viendo la semana que contiene hoy
      const weekDays = getWeekDays(currentDate);
      return weekDays.some(day => day.toDateString() === today.toDateString());
    } else if (calendarView === 'month') {
      // En vista de mes, es "hoy" si estamos viendo el mes que contiene hoy
      return (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear());
    }
    
    return false;
  };

  // Ir a la fecha actual
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrar reservas
  const filteredReservations = reservations.filter(reservation => {
    const statusMatch = statusFilter === 'all' || reservation.status === statusFilter;
    const paymentStatusMatch = paymentStatusFilter === 'all' || reservation.paymentStatus === paymentStatusFilter;
    return statusMatch && paymentStatusMatch;
  });

  // Cambiar estado de reserva
  const handleStatusChange = async (reservationId: string | undefined, newStatus: string) => {
    if (!reservationId) {
      showError('ID de reserva no válido');
      return;
    }
    
    try {
      setIsUpdating(reservationId);
      await updateReservationStatus(reservationId, newStatus as Reservation['status']);
      
      // Actualizar estado local
      setReservations(prev =>
        prev.map(res =>
          res._id === reservationId ? { ...res, status: newStatus as Reservation['status'] } : res
        )
      );
      
      showSuccess(`Estado actualizado exitosamente a: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      showError('Error al actualizar el estado de la reserva');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditReservation = (reservation: Partial<Reservation>) => {
    setEditingReservation({
      ...reservation,
      // Extraer fecha y hora para el datepicker
      editDate: reservation.reservationDate ? reservation.reservationDate.slice(0, 10) : '',
      editTime: reservation.reservationDate ? reservation.reservationDate.slice(11, 16) : ''
    });
    // Cerrar el modal de reservas del día si está abierto
    setShowReservationsModal(false);
    setShowEditModal(true);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear precio
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  // Formatear duración
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Obtener texto del estado
  const getStatusText = (status?: string) => {
    if (!status) return 'Sin estado';
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Proceso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No Show';
      case 'rescheduled': return 'Reagendada';
      default: return status;
    }
  };

  // Obtener texto del estado de pago
  const getPaymentStatusText = (status?: string) => {
    if (!status) return 'Sin estado';
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'partial': return 'Parcial';
      case 'refunded': return 'Reembolsado';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  // Componente del calendario
  const CalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const dayNames = getDayNames();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
        {/* Header del calendario */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-[#334C5D] min-w-0 truncate">
            {formatDateHeader(currentDate)}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              color="gray"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="!p-2"
            >
              <HiChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              color="gray"
              size="sm"
              onClick={() => navigateDate('next')}
              className="!p-2"
            >
              <HiChevronRight className="w-4 h-4" />
            </Button>

            <Button
              color={isViewingToday() ? 'selected' : 'secondary'}
              size="sm"
              onClick={goToToday}
              className="!px-3 !py-1.5 font-medium"
            >
              {isViewingToday() ? "✓ Hoy" : "Hoy"}
            </Button>

            {/* Toggle de vista del calendario */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 ml-auto lg:ml-2">
              <Button
                color={calendarView === 'month' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView('month')}
                className="!px-2 !py-1 text-xs font-medium"
              >
                Mes
              </Button>
              <Button
                color={calendarView === 'week' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView('week')}
                className="!px-2 !py-1 text-xs font-medium"
              >
                Semana
              </Button>
              <Button
                color={calendarView === 'day' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView('day')}
                className="!px-2 !py-1 text-xs font-medium"
              >
                Día
              </Button>
            </div>
          </div>
        </div>

        {/* Renderizado condicional basado en la vista */}
        {calendarView === 'month' && (
          <>
            {/* Nombres de días */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-1 sm:p-3 text-center text-[10px] sm:text-sm font-medium text-gray-600">
              <span className="sm:hidden">{day.substring(0, 1)}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {/* Días vacíos del mes anterior */}
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="p-1 sm:p-3 h-16 sm:h-24"></div>
          ))}

          {/* Días del mes actual */}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayReservations = getReservationsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={day}
                className={`p-1 sm:p-2 h-20 sm:h-36 border border-gray-100 hover:bg-gray-50 cursor-pointer overflow-hidden ${
                  isToday ? 'bg-[#334C5D]/5 border-[#334C5D]/20' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-[#334C5D]' : 'text-gray-900'
                  }`}>
                    {day}
                  </span>
                  {dayReservations.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full">
                      {dayReservations.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-0.5 max-h-full overflow-hidden">
                  {dayReservations.slice(0, 3).map(reservation => (
                    <div key={reservation._id} className="flex items-center gap-1 w-full">
                      <Tooltip
                        content={
                          <div className="p-3 max-w-xs">
                            <div className="space-y-2">
                              <div className="font-medium text-white">
                                {reservation.experience?.title}
                              </div>
                              <div className="space-y-1 text-xs text-gray-200">
                                <div className="flex items-center gap-2">
                                  <HiUsers className="w-3 h-3" />
                                  {getClientName(reservation)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <HiMail className="w-3 h-3" />
                                  {getClientEmail(reservation)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <HiCalendar className="w-3 h-3" />
                                  {reservation.reservationDate && formatTime(reservation.reservationDate)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <HiUsers className="w-3 h-3" />
                                  {reservation.participants} personas
                                </div>
                                {reservation.pricing?.addons && reservation.pricing.addons.length > 0 && (
                                  <div className="pt-1 mt-1 border-t border-gray-400">
                                    <div className="text-yellow-300 font-semibold mb-1">+ {reservation.pricing.addons.length} Addon{reservation.pricing.addons.length > 1 ? 's' : ''}</div>
                                    {reservation.pricing.addons.map((addon, idx: number) => (
                                      <div key={idx} className="text-gray-300">• {addon.name}</div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 pt-1 mt-1 border-t border-gray-400">
                                  <HiCurrencyDollar className="w-3 h-3" />
                                  <span className="font-semibold">{formatPrice(reservation.pricing?.total || 0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                        placement="top"
                        arrow={true}
                      >
                        <div
                          className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(reservation.status)} cursor-pointer hover:scale-105 transition-transform truncate leading-tight flex-1`}
                          title={`${reservation.reservationDate ? formatTime(reservation.reservationDate) : ''} - ${reservation.experience?.title || ''}`}
                        >
                          {reservation.reservationDate && formatTime(reservation.reservationDate)}
                        </div>
                      </Tooltip>
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors opacity-70 hover:opacity-100"
                        onClick={() => {
                          setSelectedDay(date);
                          setShowReservationsModal(true);
                        }}
                        title="Ver detalles de la reserva"
                      >
                        <HiEye className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <button
                      className="w-full text-center text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center gap-1 py-1"
                      onClick={() => {
                        setSelectedDay(date);
                        setShowReservationsModal(true);
                      }}
                      title={`${dayReservations.length - 3} reservas más`}
                    >
                      <HiEye className="w-3 h-3" />
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                        +{dayReservations.length - 3}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}

        {/* Vista de Semana */}
        {calendarView === 'week' && (
          <>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-600 mb-2">Semana</div>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {getWeekDays(currentDate).map((day, index) => (
                  <div key={index} className={`text-center p-2 rounded-lg ${isToday(day) ? 'bg-blue-100 border border-blue-300' : ''}`}>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {getDayNames()[day.getDay()]}
                    </div>
                    <div className={`text-lg font-semibold ${isToday(day) ? 'text-blue-700' : 'text-[#334C5D]'}`}>
                      {day.getDate()}
                    </div>
                    {isToday(day) && (
                      <div className="text-xs text-blue-600 font-medium mt-1">HOY</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              {getWeekDays(currentDate).map((day, index) => {
                const dayReservations = getReservationsForDate(day);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
            
                    <div className="flex items-center gap-3 mb-3">
                      <Badge color={getStatusColor(dayReservations[0]?.status || 'pending')}>
                        {dayReservations.length} reservas
                      </Badge>
                      <div className="font-medium">{day.toLocaleDateString('es-CO')}</div>
                      <button
                        className="text-gray-600 hover:text-gray-800 text-xs underline"
                        onClick={() => {
                          setSelectedDay(day);
                          setShowReservationsModal(true);
                        }}
                      >
                        Ver todas
                      </button>
                    </div>
            
                    <div className="space-y-2">
                      {dayReservations.slice(0, 3).map((reservation) => (
                        <div key={reservation._id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex items-center gap-3">
                            <HiClock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">{reservation.reservationDate && formatTime(reservation.reservationDate)}</span>
                            <span className="text-sm text-gray-600">{reservation.experience?.title}</span>
                            <Badge color={getStatusColor(reservation.status)} size="sm">
                              {reservation.status}
                            </Badge>
                          </div>
                        
                          <button
                            className="text-gray-500 hover:text-gray-700 ml-2"
                            onClick={() => {
                              setSelectedDay(day);
                              setShowReservationsModal(true);
                            }}
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Vista de Día */}
        {calendarView === 'day' && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`text-sm font-medium ${isToday(currentDate) ? 'text-blue-700' : 'text-gray-600'}`}>
                  Programación del día - {currentDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {isToday(currentDate) && (
                  <Badge color="info" size="sm">
                    HOY
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              {getHourSlots().map((hour) => {
                const hourReservations = getReservationsForTimeSlot(currentDate, hour);
                return (
                  <div key={hour} className={`border rounded-lg p-3 ${
                    isToday(currentDate) && hour < new Date().getHours() 
                      ? 'border-gray-300 bg-gray-50 opacity-75' 
                      : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-medium ${
                          isToday(currentDate) && hour < new Date().getHours() 
                            ? 'text-gray-500' 
                            : ''
                        }`}>
                          {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                        </div>
                        {hourReservations.length > 0 && (
                          <Badge color="primary" size="sm">
                            {hourReservations.length} reserva{hourReservations.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {hourReservations.length > 0 ? (
                      <div className="space-y-2">
                        {hourReservations.map((reservation) => (
                          <div key={reservation._id} className="flex items-center justify-between bg-gray-50 rounded p-2 ml-4">
                            <div className="flex items-center gap-3">
                              <HiClock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium">{reservation.reservationDate && formatTime(reservation.reservationDate)}</span>
                              <span className="text-sm text-gray-600">{reservation.experience?.title}</span>
                              <Badge color={getStatusColor(reservation.status)} size="sm">
                                {reservation.status}
                              </Badge>
                            </div>
                          
                            <button
                              className="text-gray-500 hover:text-gray-700 ml-2"
                              onClick={() => {
                                setSelectedDay(currentDate);
                                setShowReservationsModal(true);
                              }}
                            >
                              <HiEye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm ml-4 italic">
                        No hay reservas programadas
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Modal de reservas del día */}
        <Modal
          show={showReservationsModal}
          onClose={() => setShowReservationsModal(false)}
          size="4xl"
          dismissible
        >
          <ModalHeader>
            Reservas del {selectedDay?.toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {selectedDay && getReservationsForDate(selectedDay).map((reservation) => (
                <Card key={reservation._id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-[#334C5D]">
                          {reservation.reservationNumber}
                        </h3>
                        <Badge color={getStatusColorBadge(reservation.status)}>
                          {getStatusText(reservation.status)}
                        </Badge>
                        <Badge color={getStatusColorBadge(reservation.paymentStatus)}>
                          {getPaymentStatusText(reservation.paymentStatus)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Experiencia</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              {getExperienceType(reservation) === 'virtual' ? (
                                <HiVideoCamera className="w-4 h-4 text-blue-500" />
                              ) : (
                                <HiLocationMarker className="w-4 h-4 text-green-500" />
                              )}
                              <span>{reservation.experience?.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <HiClock className="w-4 h-4" />
                              {reservation.duration && formatDuration(reservation.duration)}
                            </div>
                            <div className="flex items-center gap-2">
                              <HiCalendar className="w-4 h-4" />
                              {reservation.reservationDate && formatTime(reservation.reservationDate)}
                            </div>
                            <div className="flex items-center gap-2">
                              <HiCurrencyDollar className="w-4 h-4" />
                              {formatPrice(reservation.pricing?.total || 0)}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <HiUsers className="w-4 h-4" />
                              {getClientName(reservation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <HiMail className="w-4 h-4" />
                              {getClientEmail(reservation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <HiPhone className="w-4 h-4" />
                              {getClientPhone(reservation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <HiUsers className="w-4 h-4" />
                              {reservation.participants || 0} participantes
                            </div>
                          </div>
                        </div>

                        {/* Servicios Adicionales en Modal */}
                        {reservation.pricing?.addons && reservation.pricing.addons.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Servicios Adicionales</h4>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="space-y-2">
                                {reservation.pricing.addons.map((addon, idx: number) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700">• {addon.name} <span className="text-xs text-gray-500">({addon.quantity}x)</span></span>
                                    <span className="font-medium text-[#F26726]">+${(addon.price * addon.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="pt-2 border-t border-orange-300 flex justify-between text-sm font-semibold">
                                  <span className="text-gray-700">Total Addons:</span>
                                  <span className="text-[#F26726]">
                                    ${reservation.pricing.addons.reduce((sum: number, a) => sum + (a.price * a.quantity), 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        color="gray"
                        size="sm"
                        onClick={() => handleEditReservation(reservation)}
                        title="Editar reserva"
                      >
                        <HiPencilAlt className="w-4 h-4" />
                      </Button>
                      <Select
                        value={reservation.status}
                        onChange={(e) => handleStatusChange(reservation._id, e.target.value)}
                        disabled={isUpdating === reservation._id}
                        className="w-32 text-xs"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="in_progress">En Proceso</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="no_show">No Show</option>
                        <option value="rescheduled">Reagendada</option>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
              
              {selectedDay && getReservationsForDate(selectedDay).length === 0 && (
                <div className="text-center py-8">
                  <HiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay reservas para este día</p>
                </div>
              )}
            </div>
          </ModalBody>
        </Modal>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#334C5D]">
              Mis Reservas
            </h1>
            <p className="text-sm text-gray-600">
              Gestiona todas las reservas de tus experiencias gastronómicas
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto bg-[#F26726] hover:bg-[#d9571f]"
          >
            <HiPlus className="mr-2 h-5 w-5" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <HiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-600 truncate">Total</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg shrink-0">
              <HiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-600 truncate">Confirmadas</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
              <HiExclamationCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-600 truncate">Pendientes</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
              <HiCurrencyDollar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-600 truncate">Ingresos</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{formatPrice(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filtros */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#334C5D]">
            Reservas ({filteredReservations.length})
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="no_show">No Show</option>
              <option value="rescheduled">Reagendadas</option>
            </Select>

            <Select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="all">Todos los pagos</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="paid">Pagado</option>
              <option value="refunded">Reembolsado</option>
              <option value="failed">Fallido</option>
            </Select>
            
            {/* Toggle de vista */}
            <div className="flex items-center gap-2 rounded-lg p-1">
              <Button
                color={viewMode === 'calendar' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="px-3 py-2"
              >
                <HiCalendar className="w-4 h-4" />
              </Button>
              <Button
                color={viewMode === 'grid' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3 py-2"
              >
                <HiViewGrid className="w-4 h-4" />
              </Button>
              <Button
                color={viewMode === 'list' ? 'selected' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3 py-2"
              >
                <HiViewList className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Vista del calendario */}
      {!isLoading && viewMode === 'calendar' && <CalendarView />}

      {/* Vista de lista/grid */}
      {viewMode !== 'calendar' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <HiCalendar className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No tienes reservas' : 'No hay reservas con este estado'}
              </h3>
              <p className="text-gray-600 mb-6">
                {statusFilter === 'all' 
                  ? 'Las reservas de tus experiencias aparecerán aquí'
                  : 'Cambia el filtro para ver otras reservas'
                }
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredReservations.map((reservation) => (
                    <Card key={reservation._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-[#334C5D] mb-1">
                              {reservation.reservationNumber}
                            </h3>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge color={getStatusColor(reservation.status)}>
                                {getStatusText(reservation.status)}
                              </Badge>
                              <Badge color={getStatusColor(reservation.paymentStatus)}>
                                {getPaymentStatusText(reservation.paymentStatus)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                              {reservation.experience?.title}
                            </p>
                          </div>
                        </div>

                        {/* Tipo de experiencia */}
                        <div className="flex items-center mb-2">
                          {getExperienceType(reservation) === 'virtual' ? (
                            <HiVideoCamera className="w-4 h-4 mr-1 text-blue-500" />
                          ) : (
                            <HiLocationMarker className="w-4 h-4 mr-1 text-green-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            {getExperienceType(reservation) === 'virtual' ? 'Virtual' : 
                             getExperienceType(reservation) === 'hybrid' ? 'Híbrida' : 'Presencial'}
                          </span>
                        </div>

                        {/* Cliente */}
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Cliente</h4>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <HiUsers className="w-4 h-4 mr-2" />
                              {getClientName(reservation)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <HiMail className="w-4 h-4 mr-2" />
                              {getClientEmail(reservation)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <HiPhone className="w-4 h-4 mr-2" />
                              {getClientPhone(reservation)}
                            </div>
                          </div>
                        </div>

                        {/* Detalles */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <HiCalendar className="w-4 h-4 mr-2" />
                            {reservation.reservationDate && formatDate(reservation.reservationDate)}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <HiUsers className="w-4 h-4 mr-2" />
                            {reservation.participants || 0} participantes
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <HiClock className="w-4 h-4 mr-2" />
                            {reservation.duration && formatDuration(reservation.duration)}
                          </div>
                        </div>

                        {/* Servicios Adicionales */}
                        {reservation.pricing?.addons && reservation.pricing.addons.length > 0 && (
                          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <h5 className="text-xs font-semibold text-[#334C5D] mb-2">Servicios Adicionales:</h5>
                            <div className="space-y-1">
                              {reservation.pricing.addons.map((addon, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-700">
                                  <span>• {addon.name} ({addon.quantity}x)</span>
                                  <span className="font-medium">+${addon.price.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total */}
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">Total:</span>
                            <span className="text-base font-bold text-[#F26726]">
                              {formatPrice(reservation.pricing?.total || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="pt-3 mt-2 border-t border-gray-200 space-y-2">
                          <Button
                            color="gray"
                            size="sm"
                            onClick={() => handleEditReservation(reservation)}
                            className="w-full"
                          >
                            <HiPencilAlt className="w-4 h-4 mr-2" />
                            Editar Reserva
                          </Button>
                          <Select
                            value={reservation.status}
                            onChange={(e) => handleStatusChange(reservation._id, e.target.value)}
                            disabled={isUpdating === reservation._id}
                            className="w-full text-sm"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="in_progress">En Proceso</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="no_show">No Show</option>
                            <option value="rescheduled">Reagendada</option>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReservations.map((reservation) => (
                    <Card key={reservation._id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          {/* Información principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-base font-semibold text-[#334C5D] truncate">
                                {reservation.reservationNumber}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(reservation.status)}`}>
                                  {getStatusText(reservation.status)}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(reservation.paymentStatus)}`}>
                                  {getPaymentStatusText(reservation.paymentStatus)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {reservation.experience?.title}
                              </span>
                              <div className="flex items-center gap-1">
                                <HiUsers className="w-3 h-3" />
                                {getClientName(reservation)}
                              </div>
                              <div className="flex items-center gap-1">
                                <HiCalendar className="w-3 h-3" />
                                {reservation.reservationDate && formatDate(reservation.reservationDate)}
                              </div>
                              <div className="flex items-center gap-1">
                                <HiUsers className="w-3 h-3" />
                                {reservation.participants || 0} pax
                              </div>
                              <div className="flex items-center gap-1">
                                <HiCurrencyDollar className="w-3 h-3" />
                                {formatPrice(reservation.pricing?.total || 0)}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{getClientEmail(reservation)}</span>
                              <span>{getClientPhone(reservation)}</span>
                              {reservation.pricing?.addons && reservation.pricing.addons.length > 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                                  +{reservation.pricing.addons.length} {reservation.pricing.addons.length === 1 ? 'addon' : 'addons'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Button
                              color="gray"
                              size="xs"
                              onClick={() => handleEditReservation(reservation)}
                              className="px-2 py-1"
                              title="Editar reserva"
                            >
                              <HiPencilAlt className="w-3 h-3" />
                            </Button>
                            <Select
                              value={reservation.status}
                              onChange={(e) => handleStatusChange(reservation._id, e.target.value)}
                              disabled={isUpdating === reservation._id}
                              className="w-32 text-xs"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="confirmed">Confirmada</option>
                              <option value="in_progress">En Proceso</option>
                              <option value="completed">Completada</option>
                              <option value="cancelled">Cancelada</option>
                              <option value="no_show">No Show</option>
                              <option value="rescheduled">Reagendada</option>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de Crear Reserva */}
      {showCreateModal && (
        <CreateReservationModal
          experiences={experiences}
          onClose={() => setShowCreateModal(false)}
          onReservationCreated={() => {
            setShowCreateModal(false);
            loadReservations(); // Recargar lista de reservas
            showSuccess('Reserva creada y guardada exitosamente');
          }}
        />
      )}

      {/* Modal de Edición de Reserva */}
      {showEditModal && editingReservation && (
        <div style={{ zIndex: 9999, position: 'relative' }}>
          <Modal
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            size="xl"
            dismissible
          >
          <ModalHeader>
            Editar Reserva - {editingReservation.reservationNumber}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* Información de la experiencia (solo lectura) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-[#334C5D] mb-2">Experiencia</h4>
                <p className="text-sm text-gray-600">{editingReservation.experience?.title}</p>
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de la Reserva *
                  </label>
                  <CalendarPicker
                    value={editingReservation.editDate ? new Date(editingReservation.editDate + 'T12:00:00') : null}
                    onChange={(date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const newDate = `${year}-${month}-${day}`;
                      const newDateTime = `${newDate}T${editingReservation.editTime || '10:00'}:00`;
                      setEditingReservation({
                        ...editingReservation,
                        editDate: newDate,
                        reservationDate: newDateTime
                      });
                    }}
                    placeholder="Selecciona la fecha"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora *
                  </label>
                  <TimePicker
                    value={editingReservation.editTime || ''}
                    onChange={(newTime) => {
                      const newDateTime = `${editingReservation.editDate}T${newTime}:00`;
                      setEditingReservation({
                        ...editingReservation,
                        editTime: newTime,
                        reservationDate: newDateTime
                      });
                    }}
                    placeholder="Selecciona la hora"
                    required
                  />
                </div>
              </div>

              {/* Número de participantes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Participantes
                </label>
                <input
                  type="number"
                  min="1"
                  defaultValue={editingReservation.participants}
                  onChange={(e) => setEditingReservation({
                    ...editingReservation,
                    participants: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                />
              </div>

              {/* Información del cliente (solo lectura) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-[#334C5D] mb-2">Cliente</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Nombre:</strong> {getClientName(editingReservation)}</p>
                  <p><strong>Email:</strong> {getClientEmail(editingReservation)}</p>
                  <p><strong>Teléfono:</strong> {getClientPhone(editingReservation)}</p>
                </div>
              </div>

              {/* Requisitos especiales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requisitos Especiales
                </label>
                <textarea
                  defaultValue={editingReservation.specialRequirements || ''}
                  onChange={(e) => setEditingReservation({
                    ...editingReservation,
                    specialRequirements: e.target.value
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                  placeholder="Alergias, preferencias dietéticas, etc."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Internas
                </label>
                <textarea
                  defaultValue={editingReservation.notes || ''}
                  onChange={(e) => setEditingReservation({
                    ...editingReservation,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                  placeholder="Notas internas para el equipo"
                />
              </div>

              {/* Estados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado de la Reserva
                  </label>
                  <Select
                    value={editingReservation.status}
                    onChange={(e) => setEditingReservation({
                      ...editingReservation,
                      status: e.target.value as Reservation['status']
                    })}
                    className="w-full"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="in_progress">En Proceso</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">No Show</option>
                    <option value="rescheduled">Reagendada</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado de Pago
                  </label>
                  <Select
                    value={editingReservation.paymentStatus}
                    onChange={(e) => setEditingReservation({
                      ...editingReservation,
                      paymentStatus: e.target.value as Reservation['paymentStatus']
                    })}
                    className="w-full"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="refunded">Reembolsado</option>
                    <option value="failed">Fallido</option>
                  </Select>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  color="gray"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#F26726] hover:bg-[#d9571f]"
                  onClick={async () => {
                    if (!editingReservation._id) {
                      showError('ID de reserva no válido');
                      return;
                    }

                    try {
                      // Actualizar en Sanity
                      await updateReservationInSanity({
                        _id: editingReservation._id,
                        reservationDate: editingReservation.reservationDate,
                        participants: editingReservation.participants,
                        specialRequirements: editingReservation.specialRequirements,
                        notes: editingReservation.notes,
                        status: editingReservation.status,
                        paymentStatus: editingReservation.paymentStatus,
                        // Mantener otros campos existentes
                        client: editingReservation.client,
                        duration: editingReservation.duration,
                        pricing: editingReservation.pricing,
                        paymentMethod: editingReservation.paymentMethod,
                        paymentDetails: editingReservation.paymentDetails,
                        isVirtual: editingReservation.isVirtual,
                        virtualDetails: editingReservation.virtualDetails,
                        location: editingReservation.location?._id,
                      });

                      // Actualizar estado local
                      await loadReservations();
                      setShowEditModal(false);
                      showSuccess('Reserva actualizada exitosamente');
                    } catch (error) {
                      console.error('Error al actualizar reserva:', error);
                      showError('Error al actualizar la reserva');
                    }
                  }}
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>
        </div>
      )}
    </div>
  );
}