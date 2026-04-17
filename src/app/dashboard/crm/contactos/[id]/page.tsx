"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Badge, Card } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiPencilAlt,
  HiTrash,
  HiMail,
  HiPhone,
  HiLocationMarker,
  HiUser,
  HiCalendar,
  HiTag
} from 'react-icons/hi';
import { useRouter, useParams } from 'next/navigation';
import { getContactById, deleteContact } from '@/lib/sanity/contactService';
import { Contact } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

const statusColors: Record<string, string> = {
  active: 'success',
  inactive: 'gray',
  qualified: 'info',
  unqualified: 'warning',
};

const contactTypeLabels: Record<string, string> = {
  customer: 'Cliente',
  supplier: 'Proveedor',
  other: 'Otro',
};

const sourceLabels: Record<string, string> = {
  web: 'Web',
  referral: 'Referido',
  social: 'Redes Sociales',
  email: 'Email Marketing',
  event: 'Evento',
  cold_call: 'Llamada Fría',
  other: 'Otro',
};

export default function ContactoDetailPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (contactId) {
      loadContact();
    }
  }, [contactId]);

  const loadContact = async () => {
    setIsLoading(true);
    try {
      const data = await getContactById(contactId);
      if (!data) {
        showError('Contacto no encontrado');
        router.push('/dashboard/crm/contactos');
        return;
      }
      setContact(data);
    } catch (error) {
      console.error('Error loading contact:', error);
      showError('Error al cargar el contacto');
      router.push('/dashboard/crm/contactos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;

    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará el contacto "${contact.firstName} ${contact.lastName}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteContact(contact._id);
        showSuccess('Contacto eliminado correctamente');
        router.push('/dashboard/crm/contactos');
      } catch (error) {
        console.error('Error deleting contact:', error);
        showError('Error al eliminar el contacto');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <Loader message="Cargando contacto..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (!contact) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Contacto no encontrado.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <div className="flex items-start gap-3">
              <Button
                color="gray"
                onClick={() => router.push('/dashboard/crm/contactos')}
              >
                <HiArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {contact.avatar ? (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <HiUser className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#F26726] flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-lg sm:text-xl">
                      {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {fullName}
                    </h1>
                    <Badge color={statusColors[contact.status] || 'gray'}>
                      {contact.status === 'active' && 'Activo'}
                      {contact.status === 'inactive' && 'Inactivo'}
                      {contact.status === 'qualified' && 'Calificado'}
                      {contact.status === 'unqualified' && 'No Calificado'}
                    </Badge>
                  </div>
                  {contact.jobTitle && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {contact.jobTitle}{contact.department && ` • ${contact.department}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                color="primary"
                onClick={() => router.push(`/dashboard/crm/contactos/${contact._id}/editar`)}
              >
                <HiPencilAlt className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                color="failure"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <HiTrash className="w-4 h-4 mr-2" />
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Personal */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Información Personal
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {contact.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Apellido</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {contact.lastName}
                    </p>
                  </div>
                  {contact.jobTitle && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cargo</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {contact.jobTitle}
                      </p>
                    </div>
                  )}
                  {contact.department && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departamento</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {contact.department}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Información de Contacto
              </h2>
              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center">
                    <HiMail className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center">
                    <HiPhone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center">
                    <HiPhone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${contact.mobile}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {contact.mobile} (Celular)
                    </a>
                  </div>
                )}
                {contact.companyName && (
                  <div className="flex items-center">
                    <HiUser className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-gray-900 dark:text-gray-100">
                      {contact.companyName}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Dirección */}
            {contact.address && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Dirección
                </h2>
                <div className="space-y-2">
                  {contact.address.street && (
                    <div className="flex items-start">
                      <HiLocationMarker className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-gray-900 dark:text-gray-100">
                          {contact.address.street}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {[
                            contact.address.city,
                            contact.address.state,
                            contact.address.postalCode,
                            contact.address.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Redes Sociales */}
            {contact.socialMedia && (
              (contact.socialMedia.linkedin || 
               contact.socialMedia.twitter || 
               contact.socialMedia.facebook || 
               contact.socialMedia.instagram) && (
                <Card>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Redes Sociales
                  </h2>
                  <div className="space-y-3">
                    {contact.socialMedia.linkedin && (
                      <div>
                        <a
                          href={contact.socialMedia.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {contact.socialMedia.twitter && (
                      <div>
                        <a
                          href={contact.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Twitter/X
                        </a>
                      </div>
                    )}
                    {contact.socialMedia.facebook && (
                      <div>
                        <a
                          href={contact.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Facebook
                        </a>
                      </div>
                    )}
                    {contact.socialMedia.instagram && (
                      <div>
                        <a
                          href={contact.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              )
            )}

            {/* Notas */}
            {contact.notes && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Notas
                </h2>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Columna Lateral */}
          <div className="space-y-6">
            {/* Estado y Origen */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Estado y Origen
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
                  <Badge color="info" className="mt-2">
                    {contactTypeLabels[contact.contactType] || contact.contactType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
                  <Badge color={statusColors[contact.status] || 'gray'} className="mt-2">
                    {contact.status === 'active' && 'Activo'}
                    {contact.status === 'inactive' && 'Inactivo'}
                    {contact.status === 'qualified' && 'Calificado'}
                    {contact.status === 'unqualified' && 'No Calificado'}
                  </Badge>
                </div>
                {contact.source && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Origen</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {sourceLabels[contact.source] || contact.source}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Etiquetas */}
            {contact.tags && contact.tags.length > 0 && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Etiquetas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <Badge key={index} color="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Fechas Importantes */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Fechas Importantes
              </h2>
              <div className="space-y-4">
                {contact.lastContactDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiCalendar className="w-4 h-4 mr-2" />
                      Último Contacto
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(contact.lastContactDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {contact.nextFollowUp && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiCalendar className="w-4 h-4 mr-2" />
                      Próximo Seguimiento
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(contact.nextFollowUp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Creación</p>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {new Date(contact.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {contact.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Actualización</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(contact.updatedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

