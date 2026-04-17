"use client";

import React, { useState, useEffect } from 'react';
import {
  AvailabilitySchedule,
  DaySchedule,
  TimeSlot,
  BlockedDate,
  DayOfWeek,
  Location,
  Experience,
  WeeklySchedule
} from '@/types';
import {
  getAvailabilitySchedulesByLocation,
  getAvailabilitySchedulesByExperience,
  createAvailabilitySchedule,
  updateAvailabilitySchedule,
  deleteAvailabilitySchedule,
  setPrimarySchedule,
  generateDefaultSchedule
} from '@/lib/sanity/availabilityService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineStar,
  AiOutlineCheck,
  AiOutlineClose
} from 'react-icons/ai';
import { BiCalendar, BiTime } from 'react-icons/bi';
import Loader from '@/components/Loader';

type AvailabilityManagerProps =
  | { mode: 'location'; location: Location; companyId: string }
  | { mode: 'experience'; experience: Experience; companyId: string };

const dayNames: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const daysOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const AvailabilityManager: React.FC<AvailabilityManagerProps> = (props) => {
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AvailabilitySchedule | null>(null);
  const { showSuccess, showError, showConfirmation, showLoading, hideLoading } = useSweetAlert();

  const contextId = props.mode === 'location' ? props.location._id : props.experience._id;
  const contextLabel = props.mode === 'location' ? props.location.name : props.experience.title;

  useEffect(() => {
    loadSchedules();
  }, [contextId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = props.mode === 'location'
        ? await getAvailabilitySchedulesByLocation(props.location._id)
        : await getAvailabilitySchedulesByExperience(props.experience._id);
      setSchedules(data);
    } catch (error) {
      showError('Error al cargar los calendarios de disponibilidad');
      console.error(error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setShowCreateModal(true);
  };

  const handleEditSchedule = (schedule: AvailabilitySchedule) => {
    setEditingSchedule(schedule);
    setShowCreateModal(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer',
      'Sí, eliminar'
    );

    if (confirmed) {
      try {
        showLoading('Eliminando calendario...');
        await deleteAvailabilitySchedule(scheduleId);
        hideLoading();
        await loadSchedules();
        showSuccess('Calendario eliminado exitosamente');
      } catch (error) {
        hideLoading();
        showError('Error al eliminar el calendario');
        console.error(error);
      }
    }
  };

  const handleSetPrimary = async (scheduleId: string) => {
    try {
      showLoading('Estableciendo como principal...');
      await setPrimarySchedule(scheduleId, contextId, props.mode);
      hideLoading();
      await loadSchedules();
      showSuccess('Calendario establecido como principal');
    } catch (error) {
      hideLoading();
      showError('Error al establecer el calendario como principal');
      console.error(error);
    }
  };

  const handleToggleActive = async (schedule: AvailabilitySchedule) => {
    try {
      showLoading(schedule.isActive ? 'Desactivando...' : 'Activando...');
      await updateAvailabilitySchedule({
        _id: schedule._id,
        isActive: !schedule.isActive,
      });
      hideLoading();
      await loadSchedules();
      showSuccess(
        schedule.isActive
          ? 'Calendario desactivado exitosamente'
          : 'Calendario activado exitosamente'
      );
    } catch (error) {
      hideLoading();
      showError('Error al actualizar el calendario');
      console.error(error);
    }
  };

  if (loading) {
    return <Loader message="Cargando calendarios..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-xl font-semibold text-[#334C5D]">
            Calendarios de Disponibilidad
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona los horarios de disponibilidad para {contextLabel}
          </p>
        </div>
        <button
          onClick={handleCreateSchedule}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
        >
          <AiOutlinePlus className="mr-2" />
          Nuevo Calendario
        </button>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BiCalendar className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay calendarios de disponibilidad
          </h3>
          <p className="text-gray-600 mb-4">
            Crea tu primer calendario para definir los horarios disponibles
          </p>
          <button
            onClick={handleCreateSchedule}
            className="inline-flex items-center px-4 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
          >
            <AiOutlinePlus className="mr-2" />
            Crear Calendario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule._id}
              schedule={schedule}
              onEdit={() => handleEditSchedule(schedule)}
              onDelete={() => handleDeleteSchedule(schedule._id)}
              onSetPrimary={() => handleSetPrimary(schedule._id)}
              onToggleActive={() => handleToggleActive(schedule)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ScheduleModal
          schedule={editingSchedule}
          contextId={contextId}
          contextType={props.mode}
          companyId={props.companyId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSchedule(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingSchedule(null);
            loadSchedules();
          }}
        />
      )}
    </div>
  );
};

interface ScheduleCardProps {
  schedule: AvailabilitySchedule;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onToggleActive: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onSetPrimary,
  onToggleActive,
}) => {
  const activeDays = Object.values(schedule.weeklySchedule).filter(day => day.isActive);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="text-lg font-semibold text-[#334C5D]">
                {schedule.name}
              </h4>
              {schedule.isMain && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AiOutlineStar className="mr-1" />
                  Principal
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                schedule.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {schedule.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {activeDays.length} días activos • {schedule.blockedDates?.length || 0} fechas bloqueadas
            </p>
          </div>
          <div className="flex gap-2">
            {!schedule.isMain && schedule.isActive && (
              <button
                onClick={onSetPrimary}
                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Establecer como principal"
              >
                <AiOutlineStar className="text-xl" />
              </button>
            )}
            <button
              onClick={onToggleActive}
              className={`p-2 rounded-lg transition-colors ${
                schedule.isActive
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={schedule.isActive ? 'Desactivar' : 'Activar'}
            >
              {schedule.isActive ? <AiOutlineClose className="text-xl" /> : <AiOutlineCheck className="text-xl" />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <AiOutlineEdit className="text-xl" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <AiOutlineDelete className="text-xl" />
            </button>
          </div>
        </div>

        {/* Week Schedule Preview */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700 flex items-center">
            <BiTime className="mr-2" />
            Horario Semanal
          </h5>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {daysOrder.map((dayKey) => {
              const day = schedule.weeklySchedule[dayKey];
              return (
              <div
                key={dayKey}
                className={`text-center px-1 py-1.5 sm:p-2 rounded ${
                  day.isActive
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`text-[10px] sm:text-xs font-medium ${
                  day.isActive ? 'text-green-900' : 'text-gray-400'
                }`}>
                  <span className="sm:hidden">{dayNames[dayKey].substring(0, 1)}</span>
                  <span className="hidden sm:inline">{dayNames[dayKey].substring(0, 3)}</span>
                </div>
                {day.isActive && day.timeSlots.length > 0 && (
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                    <span className="sm:hidden">{day.timeSlots.length}</span>
                    <span className="hidden sm:inline">
                      {day.timeSlots.length} slot{day.timeSlots.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {(schedule.description || schedule.notes) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            {schedule.description && (
              <p className="text-sm text-gray-700 font-medium mb-1">{schedule.description}</p>
            )}
            {schedule.notes && (
              <p className="text-sm text-gray-600">{schedule.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ScheduleModalProps {
  schedule: AvailabilitySchedule | null;
  contextId: string;
  contextType: 'location' | 'experience';
  companyId: string;
  onClose: () => void;
  onSave: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  schedule,
  contextId,
  contextType,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    schedule?.weeklySchedule || generateDefaultSchedule()
  );
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(
    schedule?.blockedDates || []
  );
  const [notes, setNotes] = useState(schedule?.notes || '');
  const [bufferTime, setBufferTime] = useState(schedule?.bufferTime || 0);
  const [minimumNotice, setMinimumNotice] = useState(schedule?.minimumNotice || 24);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useSweetAlert();

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Por favor ingresa un nombre para el calendario');
      return;
    }

    try {
      setSaving(true);

      if (schedule) {
        await updateAvailabilitySchedule({
          _id: schedule._id,
          name,
          description,
          weeklySchedule,
          blockedDates,
          notes,
          bufferTime,
          minimumNotice,
        });
        showSuccess('Calendario actualizado exitosamente');
      } else {
        await createAvailabilitySchedule({
          name,
          ...(contextType === 'location' ? { location: contextId } : { experience: contextId }),
          description,
          weeklySchedule,
          blockedDates,
          notes,
          bufferTime,
          minimumNotice,
        });
        showSuccess('Calendario creado exitosamente');
      }

      onSave();
    } catch (error) {
      showError('Error al guardar el calendario');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isActive: !prev[day].isActive,
      },
    }));
  };

  const handleAddTimeSlot = (day: DayOfWeek) => {
    setWeeklySchedule(prev => {
      const daySchedule = prev[day];
      const lastSlot = daySchedule.timeSlots[daySchedule.timeSlots.length - 1];
      const newSlot: TimeSlot = {
        startTime: lastSlot ? lastSlot.endTime : '09:00',
        endTime: lastSlot ? '18:00' : '13:00',
      };

      return {
        ...prev,
        [day]: {
          ...daySchedule,
          timeSlots: [...daySchedule.timeSlots, newSlot],
        },
      };
    });
  };

  const handleRemoveTimeSlot = (day: DayOfWeek, slotIndex: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, index) => index !== slotIndex),
      },
    }));
  };

  const handleTimeSlotChange = (
    day: DayOfWeek,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, index) =>
          index === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-[#334C5D]">
            {schedule ? 'Editar Calendario' : 'Nuevo Calendario'}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Calendario *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
              placeholder="Ej: Horario de Verano 2025"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
              placeholder="Ej: Horario estándar de operación"
            />
          </div>

          {/* Week Schedule */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Horario Semanal
            </h3>
            <div className="space-y-4">
              {daysOrder.map((dayKey) => {
                const day = weeklySchedule[dayKey];
                return (
                <div key={dayKey} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={day.isActive}
                        onChange={() => handleDayToggle(dayKey as DayOfWeek)}
                        className="w-5 h-5 text-[#F26726] rounded focus:ring-[#F26726]"
                      />
                      <span className="ml-3 font-medium text-gray-900">
                        {dayNames[dayKey as DayOfWeek]}
                      </span>
                    </div>
                    {day.isActive && (
                      <button
                        onClick={() => handleAddTimeSlot(dayKey as DayOfWeek)}
                        className="text-sm text-[#F26726] hover:text-[#d9571f] flex items-center"
                      >
                        <AiOutlinePlus className="mr-1" />
                        Agregar Horario
                      </button>
                    )}
                  </div>

                  {day.isActive && (
                    <div className="space-y-2 ml-0 sm:ml-8">
                      {day.timeSlots.map((slot: TimeSlot, slotIndex: number) => (
                        <div key={slotIndex} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => handleTimeSlotChange(dayKey as DayOfWeek, slotIndex, 'startTime', e.target.value)}
                            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => handleTimeSlotChange(dayKey as DayOfWeek, slotIndex, 'endTime', e.target.value)}
                            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          {day.timeSlots.length > 1 && (
                            <button
                              onClick={() => handleRemoveTimeSlot(dayKey as DayOfWeek, slotIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                            >
                              <AiOutlineDelete />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo de buffer (minutos)
              </label>
              <input
                type="number"
                value={bufferTime}
                onChange={(e) => setBufferTime(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tiempo entre reservas consecutivas
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aviso mínimo (horas)
              </label>
              <input
                type="number"
                value={minimumNotice}
                onChange={(e) => setMinimumNotice(parseInt(e.target.value) || 24)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                placeholder="24"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Anticipación mínima para reservas
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
              placeholder="Información adicional sobre este calendario..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;
