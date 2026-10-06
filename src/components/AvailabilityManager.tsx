"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  AvailabilitySchedule,
  Franja,
  BlockedDate,
  DayOfWeek,
  Location,
  Experience,
  WeeklySchedule
} from '@/types';
import {
  getAvailabilitySchedulesByLocation,
  getAvailabilitySchedulesByExperience,
  getHorariosDeLaPublicacion,
  getAgendaDelAnfitrion,
  createAvailabilitySchedule,
  updateAvailabilitySchedule,
  vigenciaPorDefecto,
  deleteAvailabilitySchedule,
  setPrimarySchedule,
  generateDefaultSchedule
} from '@/lib/sanity/availabilityService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  AiOutlinePlus,
  AiOutlineCopy,
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
  | { mode: 'experience'; experience: Experience; companyId: string }
  // El horario de una experiencia EN una sede: la misma pieza puede abrir los
  // sábados en el local del centro y los viernes en la finca, así que su
  // horario no es uno, es uno por escenario.
  | {
      mode: 'publicacion';
      experienceId: string;
      experienceTitle: string;
      locationId: string;
      locationName: string;
      companyId: string;
    }
  // TR-21. La agenda propia del anfitrión: ni sede ni experiencia. Es la de
  // quien va a casa del cliente y no tiene dónde colgar su calendario.
  | { mode: 'company'; companyId: string };

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

  const contextId =
    props.mode === 'location'
      ? props.location._id
      : props.mode === 'experience'
        ? props.experience._id
        : props.mode === 'publicacion'
          ? props.experienceId
          : props.companyId;
  const contextLabel =
    props.mode === 'location'
      ? props.location.name
      : props.mode === 'experience'
        ? props.experience.title
        : props.mode === 'publicacion'
          ? `${props.experienceTitle} en ${props.locationName}`
          : 'tu agenda';
  // La sede con la que se ata el horario, cuando el contexto es una
  // publicación. En los demás modos no hay pareja que atar.
  const sedeDeLaPublicacion = props.mode === 'publicacion' ? props.locationId : undefined;

  useEffect(() => {
    loadSchedules();
  }, [contextId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data =
        props.mode === 'location'
          ? await getAvailabilitySchedulesByLocation(props.location._id)
          : props.mode === 'experience'
            ? await getAvailabilitySchedulesByExperience(props.experience._id)
            : props.mode === 'publicacion'
              ? await getHorariosDeLaPublicacion(props.experienceId, props.locationId)
              : await getAgendaDelAnfitrion();
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
    // En la agenda propia no hay "principal": no se elige entre contextos,
    // porque el contexto es el anfitrión y no hay más de uno.
    if (props.mode === 'company') return;
    try {
      showLoading('Estableciendo como principal...');
      // En una publicación el contexto que manda es la experiencia: el
      // `contextId` ya es el suyo, y «principal» se decide entre sus horarios.
      await setPrimarySchedule(
        scheduleId,
        contextId,
        props.mode === 'publicacion' ? 'experience' : props.mode,
      );
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
              // En la agenda propia no hay "principal": el contexto es el
              // anfitrión y no hay más de uno entre los que elegir.
              puedeSerPrincipal={props.mode !== 'company'}
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
          locationId={sedeDeLaPublicacion}
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
  puedeSerPrincipal?: boolean;
  onToggleActive: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onSetPrimary,
  puedeSerPrincipal = true,
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
            {puedeSerPrincipal && !schedule.isMain && schedule.isActive && (
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
                {day.isActive && day.franjas.length > 0 && (
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                    <span className="sm:hidden">{day.franjas.length}</span>
                    <span className="hidden sm:inline">
                      {day.franjas.length} franja{day.franjas.length > 1 ? 's' : ''}
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
  contextType: 'location' | 'experience' | 'company' | 'publicacion';
  /**
   * La sede con la que se ata el horario cuando el contexto es una
   * publicación: el horario es de la experiencia EN ese escenario.
   */
  locationId?: string;
  companyId: string;
  onClose: () => void;
  onSave: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  schedule,
  contextId,
  contextType,
  locationId,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    schedule?.weeklySchedule || generateDefaultSchedule()
  );
  // Sin setter: hoy las fechas bloqueadas solo se leen del calendario que
  // llega por props; no hay forma de editarlas desde aqui.
  const [blockedDates] = useState<BlockedDate[]>(schedule?.blockedDates || []);
  const [notes, setNotes] = useState(schedule?.notes || '');
  // Los dos numericos se guardan como TEXTO mientras se escriben.
  //
  // Antes eran numeros y el onChange hacia `parseInt(valor) || 0`: al borrar
  // el campo para escribir otra cifra, el valor volvia solo a 0 —o a 24— y el
  // cursor quedaba detras, asi que teclear "45" daba "045" y teclear "4"
  // dejaba "04". En la practica el campo no se dejaba cambiar. El numero se
  // resuelve al guardar, que es cuando hace falta que sea un numero.
  //
  // La preparación y el aviso mínimo ya no están aquí: son de la experiencia.
  // Un mismo horario sirve a experiencias que necesitan preparaciones y
  // anticipaciones muy distintas, y tenerlos aquí obligaba a elegir una.
  // TR-35. Desde y hasta cuándo se repite. Un horario nuevo arranca hoy y
  // dura un año: suficiente para no chocar con el corte mientras se monta el
  // catálogo, y poco para que no quede una agenda abierta por décadas.
  // Inicializadores perezosos: la vigencia por defecto lee la fecha de hoy, y
  // calcularla en cada render es trabajo que no cambia nada.
  const [validFrom, setValidFrom] = useState(
    () => schedule?.validFrom ?? vigenciaPorDefecto().validFrom,
  );
  const [validUntil, setValidUntil] = useState(() =>
    schedule ? schedule.validUntil ?? '' : vigenciaPorDefecto().validUntil,
  );
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useSweetAlert();

  /**
   * El numero que el usuario dejo escrito, o el de por defecto.
   *
   * Un campo vacio no es un error: significa "lo normal". Fallar ahi obligaria
   * a escribir un cero para decir que no hay buffer.
   */

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Por favor ingresa un nombre para el calendario');
      return;
    }

    if (!validFrom) {
      showError('Indica desde cuándo se aplica este horario');
      return;
    }
    if (!schedule && !validUntil) {
      showError('Indica hasta cuándo se repite este horario');
      return;
    }
    if (validUntil && validUntil < validFrom) {
      showError('La fecha final no puede ser anterior a la de inicio');
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
          validFrom,
          // Vacío vuelve a «sin fecha final», que es lo que hacían los
          // horarios creados antes de esta regla.
          validUntil: validUntil || null,
        });
        showSuccess('Calendario actualizado exitosamente');
      } else {
        await createAvailabilitySchedule({
          name,
          // TR-21. Sin sede y sin experiencia, el horario ES la agenda del
          // anfitrión: el API le pone de dueño a su empresa y vale para todo
          // lo que no tenga el suyo.
          // Una publicación ata las DOS cosas: el horario es de esa
          // experiencia en esa sede, y no vale para las demás.
          ...(contextType === 'location'
            ? { location: contextId }
            : contextType === 'experience'
              ? { experience: contextId }
              : contextType === 'publicacion'
                ? { experience: contextId, location: locationId }
                : {}),
          description,
          weeklySchedule,
          blockedDates,
          notes,
          validFrom,
          validUntil,
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

  const agregarFranja = (day: DayOfWeek) => {
    setWeeklySchedule(prev => {
      const daySchedule = prev[day];
      const ultima = daySchedule.franjas[daySchedule.franjas.length - 1];
      const nueva: Franja = {
        startTime: ultima ? ultima.endTime : '09:00',
        endTime: ultima ? '18:00' : '13:00',
        // Los cupos se heredan de la franja anterior: quien pone 20 en el
        // almuerzo casi siempre pone 20 en la cena, y es un número menos que
        // teclear. Si no, se deja vacío y manda el aforo de la experiencia.
        cupos: ultima?.cupos ?? null,
      };

      return {
        ...prev,
        [day]: { ...daySchedule, franjas: [...daySchedule.franjas, nueva] },
      };
    });
  };

  const quitarFranja = (day: DayOfWeek, i: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        franjas: prev[day].franjas.filter((_, index) => index !== i),
      },
    }));
  };

  const cambiarFranja = (
    day: DayOfWeek,
    i: number,
    campo: 'startTime' | 'endTime' | 'cupos',
    valor: string,
  ) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        franjas: prev[day].franjas.map((f, index) =>
          index === i
            ? {
                ...f,
                // Vacío significa "sin cupos propios": manda el aforo de la
                // experiencia. Guardar 0 sería decir que no cabe nadie.
                [campo]: campo === 'cupos' ? (valor === '' ? null : Number(valor)) : valor,
              }
            : f,
        ),
      },
    }));
  };

  /**
   * Copia las franjas de un día a otros.
   *
   * Un horario de restaurante es el mismo de martes a domingo: teclear siete
   * veces lo mismo es la forma de que nadie lo configure. Se copian las
   * franjas con sus cupos, y los días que reciben quedan activos.
   */
  const replicarDia = async (origen: DayOfWeek) => {
    const franjas = weeklySchedule[origen].franjas;
    if (franjas.length === 0) {
      showError('Ese día no tiene franjas', 'Agrega al menos una antes de replicarla.');
      return;
    }

    const otros = daysOrder.filter((d) => d !== origen);
    const { value, isConfirmed } = await Swal.fire({
      title: `Replicar ${dayNames[origen]}`,
      html: `
        <p style="font-size:13px;color:#6b7280;margin:0 0 10px;text-align:left">
          Se copian sus ${franjas.length === 1 ? 'franja' : `${franjas.length} franjas`} con
          sus cupos. Lo que esos días tengan ahora se reemplaza.
        </p>
        <div style="text-align:left;font-size:14px">
          ${otros
            .map(
              (d) => `
            <label style="display:flex;align-items:center;gap:8px;margin:6px 0">
              <input type="checkbox" id="dia-${d}" checked style="width:16px;height:16px">
              ${dayNames[d]}
            </label>`,
            )
            .join('')}
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Replicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () =>
        otros.filter(
          (d) => (document.getElementById(`dia-${d}`) as HTMLInputElement | null)?.checked,
        ),
    });
    if (!isConfirmed || !Array.isArray(value) || value.length === 0) return;

    setWeeklySchedule(prev => {
      const siguiente = { ...prev };
      for (const d of value as DayOfWeek[]) {
        siguiente[d] = {
          isActive: true,
          // Copia, no referencia: si se comparte el array, editar un día
          // edita todos y nadie entiende por qué.
          franjas: franjas.map((f) => ({ ...f })),
        };
      }
      return siguiente;
    });
    showSuccess('Franjas replicadas', `Se copiaron a ${value.length} día(s).`);
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
              Franjas horarias de la semana
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
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Replicar: un horario de restaurante es el mismo de
                            martes a domingo, y teclear siete veces lo mismo es
                            la forma de que nadie lo configure. */}
                        {day.franjas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => void replicarDia(dayKey as DayOfWeek)}
                            className="flex items-center text-sm text-gray-600 hover:text-[#F26726]"
                          >
                            <AiOutlineCopy className="mr-1" />
                            Replicar a otros días
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => agregarFranja(dayKey as DayOfWeek)}
                          className="text-sm text-[#F26726] hover:text-[#d9571f] flex items-center"
                        >
                          <AiOutlinePlus className="mr-1" />
                          Agregar franja horaria
                        </button>
                      </div>
                    )}
                  </div>

                  {day.isActive && (
                    <div className="space-y-2 ml-0 sm:ml-8">
                      {day.franjas.map((franja: Franja, i: number) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            aria-label="Desde"
                            value={franja.startTime}
                            onChange={(e) => cambiarFranja(dayKey as DayOfWeek, i, 'startTime', e.target.value)}
                            className="flex-1 min-w-[110px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            aria-label="Hasta"
                            value={franja.endTime}
                            onChange={(e) => cambiarFranja(dayKey as DayOfWeek, i, 'endTime', e.target.value)}
                            className="flex-1 min-w-[110px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          {/* Los cupos de ESTA franja: el almuerzo y la cena de
                              un sábado se llenan por separado. Vacío = manda el
                              aforo de la experiencia. */}
                          <input
                            type="number"
                            min="1"
                            aria-label="Cupos de esta franja"
                            value={franja.cupos ?? ''}
                            onChange={(e) => cambiarFranja(dayKey as DayOfWeek, i, 'cupos', e.target.value)}
                            placeholder="Cupos"
                            className="w-[92px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          {day.franjas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => quitarFranja(dayKey as DayOfWeek, i)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                              aria-label="Quitar esta franja"
                            >
                              <AiOutlineDelete />
                            </button>
                          )}
                        </div>
                      ))}
                      <p className="text-xs text-gray-500">
                        Los cupos son de cada franja. Si lo dejas vacío, manda el
                        aforo de la experiencia.
                      </p>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* La preparación y el aviso mínimo se piden en la experiencia, no
              aquí: un mismo horario sirve a una cata que se monta en diez
              minutos y a un taller que necesita una hora, y guardarlos aquí
              obligaba a elegir una de las dos. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">
              La preparación y la anticipación mínima se configuran en cada
              experiencia, porque dependen de lo que se vende y no del día.
            </p>
          </div>

          {/* TR-35. Hasta cuándo se repite. Sin fecha final, el calendario
              ofrece sábados de dentro de cinco años que nadie decidió abrir. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Se aplica desde
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Antes de esta fecha no se ofrecen horarios
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={validUntil}
                min={validFrom}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {schedule && !validUntil
                  ? 'Ahora no tiene fecha final: se repite indefinidamente. Ponle una.'
                  : 'Después de esta fecha deja de ofrecer franjas. Puedes extenderla cuando quieras.'}
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
