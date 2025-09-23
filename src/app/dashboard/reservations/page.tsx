"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getReservationsByCompany, getReservationStatsByCompany, updateReservationStatus, updateReservationPaymentStatus } from '@/lib/sanity/reservationService';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { Reservation, Company } from '@/types';
import { Button, Card, Select, Badge } from 'flowbite-react';
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
  HiStar,
  HiXCircle,
  HiRefresh
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

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
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cargar datos
  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const companyData = await getCompanyByUserId(user.uid);

      if (!companyData) {
        showError('No se encontró información de empresa. Completa el registro de empresa primero.');
        router.push('/dashboard/company-setup');
        return;
      }

      setCompany(companyData);

      // Cargar reservas y estadísticas con el ID de la empresa
      const [reservationsWithCompany, statsWithCompany] = await Promise.all([
        getReservationsByCompany(companyData._id),
        getReservationStatsByCompany(companyData._id)
      ]);

      setReservations(reservationsWithCompany);
      setStats(statsWithCompany);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filtrar reservas
  const filteredReservations = reservations.filter(reservation => {
    const statusMatch = statusFilter === 'all' || reservation.status === statusFilter;
    const paymentStatusMatch = paymentStatusFilter === 'all' || reservation.paymentStatus === paymentStatusFilter;
    return statusMatch && paymentStatusMatch;
  });

  // Cambiar estado de reserva
  const handleStatusChange = async (reservationId: string, newStatus: Reservation['status']) => {
    try {
      setIsUpdating(reservationId);
      await updateReservationStatus(reservationId, newStatus);
      
      // Actualizar estado local
      setReservations(prev => 
        prev.map(res => 
          res._id === reservationId 
            ? { ...res, status: newStatus }
            : res
        )
      );

      // Recargar estadísticas
      if (company) {
        const newStats = await getReservationStatsByCompany(company._id);
        setStats(newStats);
      }

      showSuccess('Estado actualizado exitosamente');
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar el estado');
    } finally {
      setIsUpdating(null);
    }
  };

  // Cambiar estado de pago
  const handlePaymentStatusChange = async (reservationId: string, newPaymentStatus: Reservation['paymentStatus']) => {
    try {
      setIsUpdating(reservationId);
      await updateReservationPaymentStatus(reservationId, newPaymentStatus);
      
      // Actualizar estado local
      setReservations(prev => 
        prev.map(res => 
          res._id === reservationId 
            ? { ...res, paymentStatus: newPaymentStatus }
            : res
        )
      );

      // Recargar estadísticas
      if (company) {
        const newStats = await getReservationStatsByCompany(company._id);
        setStats(newStats);
      }

      showSuccess('Estado de pago actualizado exitosamente');
    } catch (error) {
      console.error('Error updating payment status:', error);
      showError('Error al actualizar el estado de pago');
    } finally {
      setIsUpdating(null);
    }
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

  // Obtener color del estado
  const getStatusColor = (status: string) => {
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

  // Obtener texto del estado
  const getStatusText = (status: string) => {
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

  // Obtener color del estado de pago
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'partial': return 'info';
      case 'refunded': return 'info';
      case 'failed': return 'failure';
      default: return 'gray';
    }
  };

  // Obtener texto del estado de pago
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'partial': return 'Parcial';
      case 'refunded': return 'Reembolsado';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  if (isLoading) {
    return <Loader message="Cargando tus reservas..." />;
  }

  if (!company) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
            Empresa no encontrada
          </h2>
          <p className="text-gray-600 mb-6">
            Necesitas completar el registro de tu empresa antes de gestionar reservas.
          </p>
          <Button
            color="primary"
            onClick={() => router.push('/dashboard/company-setup')}
            className="px-6 py-3"
          >
            Completar Registro de Empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
              Mis Reservas
            </h1>
            <p className="text-gray-600">
              Gestiona todas las reservas de <span className="font-bold">{company.companyName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HiCalendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reservas</p>
                <p className="text-2xl font-bold text-[#334C5D]">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <HiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-[#334C5D]">{stats.confirmed}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <HiExclamationCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-[#334C5D]">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HiCurrencyDollar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-[#334C5D]">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <hr className="my-8 border-gray-200" />

      {/* Filtros */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#334C5D]">
            Reservas ({filteredReservations.length})
          </h2>
          
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
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
              className="w-48"
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
                color={viewMode === 'grid' ? 'primary' : 'gray'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3 py-2"
              >
                <HiViewGrid className="w-4 h-4" />
              </Button>
              <Button
                color={viewMode === 'list' ? 'primary' : 'gray'}
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

      {/* Lista de Reservas */}
      {filteredReservations.length === 0 ? (
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
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#334C5D] mb-2">
                          {reservation.reservationNumber}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color={getStatusColor(reservation.status)}>
                            {getStatusText(reservation.status)}
                          </Badge>
                          <Badge color={getPaymentStatusColor(reservation.paymentStatus)}>
                            {getPaymentStatusText(reservation.paymentStatus)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {reservation.experience?.title}
                        </p>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Cliente</h4>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <HiUsers className="w-4 h-4 mr-2" />
                          {reservation.client.name}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <HiMail className="w-4 h-4 mr-2" />
                          {reservation.client.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <HiPhone className="w-4 h-4 mr-2" />
                          {reservation.client.phone}
                        </div>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <HiCalendar className="w-4 h-4 mr-2" />
                        {formatDate(reservation.reservationDate)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiUsers className="w-4 h-4 mr-2" />
                        {reservation.participants} participantes
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiClock className="w-4 h-4 mr-2" />
                        {formatDuration(reservation.duration)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiCurrencyDollar className="w-4 h-4 mr-2" />
                        {formatPrice(reservation.pricing.total)}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Button
                          color="gray"
                          size="sm"
                          onClick={() => {
                            // TODO: Implementar vista de detalles
                            console.log('Ver detalles de:', reservation.reservationNumber);
                          }}
                          title="Ver detalles"
                        >
                          <HiEye className="w-4 h-4" />
                        </Button>
                        <Button
                          color="gray"
                          size="sm"
                          onClick={() => {
                            // TODO: Implementar edición
                            console.log('Editar reserva:', reservation.reservationNumber);
                          }}
                          title="Editar reserva"
                        >
                          <HiPencilAlt className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={reservation.status}
                          onChange={(e) => handleStatusChange(reservation._id, e.target.value as Reservation['status'])}
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
          ) : (
            <div className="space-y-2">
              {filteredReservations.map((reservation) => (
                <Card key={reservation._id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Información principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-[#334C5D] truncate">
                            {reservation.reservationNumber}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge color={getStatusColor(reservation.status)} size="sm">
                              {getStatusText(reservation.status)}
                            </Badge>
                            <Badge color={getPaymentStatusColor(reservation.paymentStatus)} size="sm">
                              {getPaymentStatusText(reservation.paymentStatus)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {reservation.experience?.title}
                          </span>
                          <div className="flex items-center gap-1">
                            <HiUsers className="w-3 h-3" />
                            {reservation.client.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <HiCalendar className="w-3 h-3" />
                            {formatDate(reservation.reservationDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <HiUsers className="w-3 h-3" />
                            {reservation.participants} pax
                          </div>
                          <div className="flex items-center gap-1">
                            <HiCurrencyDollar className="w-3 h-3" />
                            {formatPrice(reservation.pricing.total)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{reservation.client.email}</span>
                          <span>{reservation.client.phone}</span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <Button
                          color="gray"
                          size="xs"
                          onClick={() => {
                            // TODO: Implementar vista de detalles
                            console.log('Ver detalles de:', reservation.reservationNumber);
                          }}
                          className="px-2 py-1"
                          title="Ver detalles"
                        >
                          <HiEye className="w-3 h-3" />
                        </Button>
                        <Button
                          color="gray"
                          size="xs"
                          onClick={() => {
                            // TODO: Implementar edición
                            console.log('Editar reserva:', reservation.reservationNumber);
                          }}
                          className="px-2 py-1"
                          title="Editar reserva"
                        >
                          <HiPencilAlt className="w-3 h-3" />
                        </Button>
                        <Select
                          value={reservation.status}
                          onChange={(e) => handleStatusChange(reservation._id, e.target.value as Reservation['status'])}
                          disabled={isUpdating === reservation._id}
                          className="w-28 text-xs"
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
    </div>
  );
}
