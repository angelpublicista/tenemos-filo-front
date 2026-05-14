"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select, Badge, Card, Dropdown, DropdownItem } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiPlus, 
  HiSearch, 
  HiPencilAlt, 
  HiEye,
  HiTrash,
  HiMail,
  HiPhone,
  HiUser,
  HiDownload,
} from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { getContactsByHost, deleteContact } from '@/lib/sanity/contactService';
import { Contact, ContactFilters } from '@/types';
import { SkeletonTableRow } from '@/components/Skeleton';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { exportContactsToExcel, exportContactsToCSV } from '@/utils/exportUtils';

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

export default function ContactosPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (sanityUser?.companyId) {
      loadContacts();
    }
  }, [sanityUser?.companyId, searchQuery, filters]);

  const loadContacts = async () => {
    if (!sanityUser?.companyId) return;

    setIsLoading(true);
    try {
      const data = await getContactsByHost(sanityUser.companyId, {
        query: searchQuery || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
      showError('Error al cargar los contactos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contactId: string, contactName: string) => {
    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará el contacto "${contactName}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(contactId);
      try {
        await deleteContact(contactId);
        showSuccess('Contacto eliminado correctamente');
        loadContacts();
      } catch (error) {
        console.error('Error deleting contact:', error);
        showError('Error al eliminar el contacto');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleFilterChange = (key: keyof ContactFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleExportExcel = () => {
    if (contacts.length === 0) {
      showError('No hay contactos para exportar');
      return;
    }
    setIsExporting(true);
    try {
      exportContactsToExcel(contacts, 'contactos_crm');
      showSuccess('Contactos exportados a Excel correctamente');
    } catch (error) {
      console.error('Error exporting contacts:', error);
      showError('Error al exportar los contactos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      showError('No hay contactos para exportar');
      return;
    }
    setIsExporting(true);
    try {
      exportContactsToCSV(contacts, 'contactos_crm');
      showSuccess('Contactos exportados a CSV correctamente');
    } catch (error) {
      console.error('Error exporting contacts:', error);
      showError('Error al exportar los contactos');
    } finally {
      setIsExporting(false);
    }
  };

  if (!sanityUser?.companyId) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Debes tener una empresa configurada para gestionar contactos CRM.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                color="gray"
                onClick={() => router.push('/dashboard/crm')}
              >
                <HiArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Contactos CRM
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestiona tu base de datos de contactos
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {contacts.length > 0 && (
                <Dropdown
                  label=""
                  renderTrigger={() => (
                    <Button
                      color="gray"
                      disabled={isExporting}
                    >
                      <HiDownload className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exportando...' : 'Exportar'}
                    </Button>
                  )}
                  placement="bottom-end"
                >
                  <DropdownItem onClick={handleExportExcel} disabled={isExporting}>
                    Exportar a Excel (.xlsx)
                  </DropdownItem>
                  <DropdownItem onClick={handleExportCSV} disabled={isExporting}>
                    Exportar a CSV (.csv)
                  </DropdownItem>
                </Dropdown>
              )}
              <Button
                color="primary"
                onClick={() => router.push('/dashboard/crm/contactos/crear')}
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Nuevo Contacto
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <TextInput
                id="search"
                type="text"
                placeholder="Buscar por nombre, email, teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={HiSearch}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                id="status"
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1"
              >
                <option value="all">Todos</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="qualified">Calificado</option>
                <option value="unqualified">No Calificado</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactType">Tipo</Label>
              <Select
                id="contactType"
                value={filters.contactType || 'all'}
                onChange={(e) => handleFilterChange('contactType', e.target.value)}
                className="mt-1"
              >
                <option value="all">Todos</option>
                <option value="customer">Cliente</option>
                <option value="supplier">Proveedor</option>
                <option value="other">Otro</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tabla de Contactos */}
        {isLoading ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            {contacts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No se encontraron contactos.
                </p>
                <Button
                  color="primary"
                  onClick={() => router.push('/dashboard/crm/contactos/crear')}
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Crear Primer Contacto
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">Contacto</th>
                      <th scope="col" className="px-6 py-3">Empresa</th>
                      <th scope="col" className="px-6 py-3">Contacto</th>
                      <th scope="col" className="px-6 py-3">Tipo</th>
                      <th scope="col" className="px-6 py-3">Estado</th>
                      <th scope="col" className="px-6 py-3">Último Contacto</th>
                      <th scope="col" className="px-6 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div className="flex items-center">
                            {contact.avatar ? (
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3 flex items-center justify-center">
                                <HiUser className="w-6 h-6 text-gray-400" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#F26726] mr-3 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">
                                {contact.firstName} {contact.lastName}
                              </div>
                              {contact.jobTitle && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {contact.jobTitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {contact.companyName ? (
                            <span className="text-gray-900 dark:text-gray-100">
                              {contact.companyName}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin empresa</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <HiMail className="w-4 h-4 mr-1" />
                                {contact.email}
                              </div>
                            )}
                            {(contact.phone || contact.mobile) && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <HiPhone className="w-4 h-4 mr-1" />
                                {contact.mobile || contact.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color="info">
                            {contactTypeLabels[contact.contactType] || contact.contactType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color={statusColors[contact.status] || 'gray'}>
                            {contact.status === 'active' && 'Activo'}
                            {contact.status === 'inactive' && 'Inactivo'}
                            {contact.status === 'qualified' && 'Calificado'}
                            {contact.status === 'unqualified' && 'No Calificado'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {contact.lastContactDate ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(contact.lastContactDate).toLocaleDateString('es-ES')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Nunca</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/contactos/${contact._id}`)}
                            >
                              <HiEye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/contactos/${contact._id}/editar`)}
                            >
                              <HiPencilAlt className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => handleDelete(contact._id, `${contact.firstName} ${contact.lastName}`)}
                              disabled={isDeleting === contact._id}
                            >
                              <HiTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

