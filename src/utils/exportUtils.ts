import * as XLSX from 'xlsx';
import { CRMCompany } from '@/types';
import { Contact } from '@/types';

/**
 * Exporta un array de empresas a Excel (XLSX)
 */
export const exportCompaniesToExcel = (companies: CRMCompany[], filename: string = 'empresas') => {
  const data = companies.map((company) => ({
    'Nombre': company.companyName,
    'Razón Social': company.businessName || '',
    'Tipo': company.companyType === 'customer' ? 'Cliente' : company.companyType === 'supplier' ? 'Proveedor' : 'Otro',
    'Industria': company.industry || '',
    'Email': company.email || '',
    'Teléfono': company.phone || '',
    'Sitio Web': company.website || '',
    'Estado': 
      company.status === 'active' ? 'Activo' :
      company.status === 'inactive' ? 'Inactivo' :
      company.status === 'qualified' ? 'Calificado' :
      company.status === 'unqualified' ? 'No Calificado' :
      company.status === 'closed' ? 'Cerrado' : company.status,
    'Origen': company.source || '',
    'Dirección': company.address?.street || '',
    'Ciudad': company.address?.city || '',
    'Departamento/Estado': company.address?.state || '',
    'Código Postal': company.address?.postalCode || '',
    'País': company.address?.country || '',
    'Etiquetas': company.tags?.join(', ') || '',
    'Fecha de Creación': company.createdAt ? new Date(company.createdAt).toLocaleDateString('es-ES') : '',
    'Última Actualización': company.updatedAt ? new Date(company.updatedAt).toLocaleDateString('es-ES') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
  
  // Autoajustar columnas
  const maxWidth = data.reduce((max, row) => {
    Object.values(row).forEach((cell: unknown) => {
      const cellLength = String(cell).length;
      if (cellLength > max) max = cellLength;
    });
    return max;
  }, 10);
  
  ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: Math.min(maxWidth, 30) }));
  
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Exporta un array de empresas a CSV
 */
export const exportCompaniesToCSV = (companies: CRMCompany[], filename: string = 'empresas') => {
  const headers = [
    'Nombre',
    'Razón Social',
    'Tipo',
    'Industria',
    'Email',
    'Teléfono',
    'Sitio Web',
    'Estado',
    'Origen',
    'Dirección',
    'Ciudad',
    'Departamento/Estado',
    'Código Postal',
    'País',
    'Etiquetas',
    'Fecha de Creación',
    'Última Actualización',
  ];

  const rows = companies.map((company) => [
    company.companyName,
    company.businessName || '',
    company.companyType === 'customer' ? 'Cliente' : company.companyType === 'supplier' ? 'Proveedor' : 'Otro',
    company.industry || '',
    company.email || '',
    company.phone || '',
    company.website || '',
    company.status === 'active' ? 'Activo' :
      company.status === 'inactive' ? 'Inactivo' :
      company.status === 'qualified' ? 'Calificado' :
      company.status === 'unqualified' ? 'No Calificado' :
      company.status === 'closed' ? 'Cerrado' : company.status,
    company.source || '',
    company.address?.street || '',
    company.address?.city || '',
    company.address?.state || '',
    company.address?.postalCode || '',
    company.address?.country || '',
    company.tags?.join(', ') || '',
    company.createdAt ? new Date(company.createdAt).toLocaleDateString('es-ES') : '',
    company.updatedAt ? new Date(company.updatedAt).toLocaleDateString('es-ES') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta un array de contactos a Excel (XLSX)
 */
export const exportContactsToExcel = (contacts: Contact[], filename: string = 'contactos') => {
  const data = contacts.map((contact) => ({
    'Nombre': contact.firstName,
    'Apellido': contact.lastName,
    'Cargo': contact.jobTitle || '',
    'Departamento': contact.department || '',
    'Email': contact.email || '',
    'Teléfono': contact.phone || '',
    'Celular': contact.mobile || '',
    'Empresa': contact.companyName || '',
    'Tipo': contact.contactType === 'customer' ? 'Cliente' : contact.contactType === 'supplier' ? 'Proveedor' : 'Otro',
    'Estado': 
      contact.status === 'active' ? 'Activo' :
      contact.status === 'inactive' ? 'Inactivo' :
      contact.status === 'qualified' ? 'Calificado' :
      contact.status === 'unqualified' ? 'No Calificado' : contact.status,
    'Origen': contact.source || '',
    'Dirección': contact.address?.street || '',
    'Ciudad': contact.address?.city || '',
    'Departamento/Estado': contact.address?.state || '',
    'Código Postal': contact.address?.postalCode || '',
    'País': contact.address?.country || '',
    'LinkedIn': contact.socialMedia?.linkedin || '',
    'Twitter/X': contact.socialMedia?.twitter || '',
    'Facebook': contact.socialMedia?.facebook || '',
    'Instagram': contact.socialMedia?.instagram || '',
    'Etiquetas': contact.tags?.join(', ') || '',
    'Último Contacto': contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString('es-ES') : '',
    'Próximo Seguimiento': contact.nextFollowUp ? new Date(contact.nextFollowUp).toLocaleDateString('es-ES') : '',
    'Fecha de Creación': contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('es-ES') : '',
    'Última Actualización': contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString('es-ES') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
  
  // Autoajustar columnas
  const maxWidth = data.reduce((max, row) => {
    Object.values(row).forEach((cell: unknown) => {
      const cellLength = String(cell).length;
      if (cellLength > max) max = cellLength;
    });
    return max;
  }, 10);
  
  ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: Math.min(maxWidth, 30) }));
  
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Exporta un array de contactos a CSV
 */
export const exportContactsToCSV = (contacts: Contact[], filename: string = 'contactos') => {
  const headers = [
    'Nombre',
    'Apellido',
    'Cargo',
    'Departamento',
    'Email',
    'Teléfono',
    'Celular',
    'Empresa',
    'Tipo',
    'Estado',
    'Origen',
    'Dirección',
    'Ciudad',
    'Departamento/Estado',
    'Código Postal',
    'País',
    'LinkedIn',
    'Twitter/X',
    'Facebook',
    'Instagram',
    'Etiquetas',
    'Último Contacto',
    'Próximo Seguimiento',
    'Fecha de Creación',
    'Última Actualización',
  ];

  const rows = contacts.map((contact) => [
    contact.firstName,
    contact.lastName,
    contact.jobTitle || '',
    contact.department || '',
    contact.email || '',
    contact.phone || '',
    contact.mobile || '',
    contact.companyName || '',
    contact.contactType === 'customer' ? 'Cliente' : contact.contactType === 'supplier' ? 'Proveedor' : 'Otro',
    contact.status === 'active' ? 'Activo' :
      contact.status === 'inactive' ? 'Inactivo' :
      contact.status === 'qualified' ? 'Calificado' :
      contact.status === 'unqualified' ? 'No Calificado' : contact.status,
    contact.source || '',
    contact.address?.street || '',
    contact.address?.city || '',
    contact.address?.state || '',
    contact.address?.postalCode || '',
    contact.address?.country || '',
    contact.socialMedia?.linkedin || '',
    contact.socialMedia?.twitter || '',
    contact.socialMedia?.facebook || '',
    contact.socialMedia?.instagram || '',
    contact.tags?.join(', ') || '',
    contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString('es-ES') : '',
    contact.nextFollowUp ? new Date(contact.nextFollowUp).toLocaleDateString('es-ES') : '',
    contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('es-ES') : '',
    contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString('es-ES') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

