import { sanityClient } from './sanityClient';
import { 
  Contact, 
  CreateContactData, 
  UpdateContactData, 
  ContactSearchParams 
} from '@/types';

// Crear un nuevo contacto
export const createContact = async (contactData: CreateContactData): Promise<Contact> => {
  try {
    const doc = {
      _type: 'contact',
      hostCompany: {
        _type: 'reference',
        _ref: contactData.hostCompany,
      },
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email || '',
      phone: contactData.phone || '',
      mobile: contactData.mobile || '',
      jobTitle: contactData.jobTitle || '',
      department: contactData.department || '',
      company: contactData.company ? {
        _type: 'reference',
        _ref: contactData.company,
      } : undefined,
      contactType: contactData.contactType,
      status: contactData.status || 'active',
      source: contactData.source || '',
      address: contactData.address ? {
        street: contactData.address.street || '',
        city: contactData.address.city || '',
        state: contactData.address.state || '',
        postalCode: contactData.address.postalCode || '',
        country: contactData.address.country || 'CO',
      } : undefined,
      avatar: contactData.avatar ? {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: contactData.avatar,
        },
      } : undefined,
      notes: contactData.notes || '',
      tags: contactData.tags || [],
      socialMedia: contactData.socialMedia ? {
        linkedin: contactData.socialMedia.linkedin || '',
        twitter: contactData.socialMedia.twitter || '',
        facebook: contactData.socialMedia.facebook || '',
        instagram: contactData.socialMedia.instagram || '',
      } : undefined,
      assignedTo: contactData.assignedTo ? {
        _type: 'reference',
        _ref: contactData.assignedTo,
      } : undefined,
      lastContactDate: contactData.lastContactDate || undefined,
      nextFollowUp: contactData.nextFollowUp || undefined,
      isActive: contactData.isActive !== undefined ? contactData.isActive : true,
      createdBy: {
        _type: 'reference',
        _ref: contactData.createdBy,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result as Contact;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw new Error('Error al crear el contacto');
  }
};

// Obtener contacto por ID
export const getContactById = async (contactId: string): Promise<Contact | null> => {
  try {
    const query = `
      *[_type == "contact" && _id == $contactId && !defined(deletedAt)][0] {
        _id,
        _type,
        hostCompany,
        firstName,
        lastName,
        email,
        phone,
        mobile,
        jobTitle,
        department,
        company,
        contactType,
        status,
        source,
        address,
        avatar,
        notes,
        tags,
        socialMedia,
        assignedTo,
        lastContactDate,
        nextFollowUp,
        isActive,
        createdBy,
        deletedAt,
        createdAt,
        updatedAt,
        "hostCompanyName": hostCompany->companyName,
        "companyName": company->companyName,
        "assignedToName": assignedTo->name,
        "createdByName": createdBy->name
      }
    `;

    const contact = await sanityClient.fetch(query, { contactId });
    return contact || null;
  } catch (error) {
    console.error('Error fetching contact:', error);
    throw new Error('Error al obtener el contacto');
  }
};

// Obtener contactos por empresa anfitriona
export const getContactsByHost = async (
  hostCompanyId: string,
  searchParams: ContactSearchParams = {}
): Promise<Contact[]> => {
  try {
    const { query: searchQuery, filters, sortBy = 'createdAt', sortOrder = 'desc', limit = 50 } = searchParams;

    let groqQuery = `
      *[_type == "contact" 
        && hostCompany._ref == $hostCompanyId
        && !defined(deletedAt)
    `;

    // Aplicar filtros
    if (filters) {
      if (filters.contactType) {
        groqQuery += ` && contactType == $contactType`;
      }
      if (filters.status) {
        groqQuery += ` && status == $status`;
      }
      if (filters.source) {
        groqQuery += ` && source == $source`;
      }
      if (filters.company) {
        groqQuery += ` && company._ref == $company`;
      }
      if (filters.assignedTo) {
        groqQuery += ` && assignedTo._ref == $assignedTo`;
      }
      if (filters.isActive !== undefined) {
        groqQuery += ` && isActive == $isActive`;
      }
    }

    // Búsqueda por texto
    if (searchQuery) {
      groqQuery += ` && (
        firstName match $searchQuery ||
        lastName match $searchQuery ||
        email match $searchQuery ||
        phone match $searchQuery ||
        mobile match $searchQuery ||
        jobTitle match $searchQuery
      )`;
    }

    groqQuery += `] {
      _id,
      _type,
      hostCompany,
      firstName,
      lastName,
      email,
      phone,
      mobile,
      jobTitle,
      department,
      company,
      contactType,
      status,
      source,
      address,
      avatar,
      notes,
      tags,
      socialMedia,
      assignedTo,
      lastContactDate,
      nextFollowUp,
      isActive,
      createdBy,
      deletedAt,
      createdAt,
      updatedAt,
      "hostCompanyName": hostCompany->companyName,
      "companyName": company->companyName,
      "assignedToName": assignedTo->name,
      "createdByName": createdBy->name
    }`;

    // Ordenar
    const sortField = sortBy === 'firstName' ? 'firstName' : 
                     sortBy === 'lastName' ? 'lastName' :
                     sortBy === 'lastContactDate' ? 'lastContactDate' :
                     sortBy === 'nextFollowUp' ? 'nextFollowUp' : 'createdAt';
    groqQuery += ` | order(${sortField} ${sortOrder})`;

    // Limitar resultados
    if (limit) {
      groqQuery += ` [0...${limit}]`;
    }

    const queryParams: Record<string, unknown> = {
      hostCompanyId,
    };

    if (filters) {
      if (filters.contactType) queryParams.contactType = filters.contactType;
      if (filters.status) queryParams.status = filters.status;
      if (filters.source) queryParams.source = filters.source;
      if (filters.company) queryParams.company = filters.company;
      if (filters.assignedTo) queryParams.assignedTo = filters.assignedTo;
      if (filters.isActive !== undefined) queryParams.isActive = filters.isActive;
    }

    if (searchQuery) {
      queryParams.searchQuery = `*${searchQuery}*`;
    }

    const contacts = await sanityClient.fetch(groqQuery, queryParams);
    return contacts || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw new Error('Error al obtener los contactos');
  }
};

// Actualizar contacto
export const updateContact = async (
  contactId: string,
  updateData: UpdateContactData
): Promise<Contact> => {
  try {
    const patch = sanityClient.patch(contactId);

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.firstName !== undefined) updates.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) updates.lastName = updateData.lastName;
    if (updateData.email !== undefined) updates.email = updateData.email;
    if (updateData.phone !== undefined) updates.phone = updateData.phone;
    if (updateData.mobile !== undefined) updates.mobile = updateData.mobile;
    if (updateData.jobTitle !== undefined) updates.jobTitle = updateData.jobTitle;
    if (updateData.department !== undefined) updates.department = updateData.department;
    if (updateData.company !== undefined) {
      updates.company = updateData.company ? {
        _type: 'reference',
        _ref: updateData.company,
      } : undefined;
    }
    if (updateData.contactType !== undefined) updates.contactType = updateData.contactType;
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.source !== undefined) updates.source = updateData.source;
    if (updateData.address !== undefined) {
      updates.address = {
        street: updateData.address.street || '',
        city: updateData.address.city || '',
        state: updateData.address.state || '',
        postalCode: updateData.address.postalCode || '',
        country: updateData.address.country || 'CO',
      };
    }
    if (updateData.avatar !== undefined) {
      updates.avatar = updateData.avatar ? {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: updateData.avatar,
        },
      } : undefined;
    }
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    if (updateData.tags !== undefined) updates.tags = updateData.tags;
    if (updateData.socialMedia !== undefined) {
      updates.socialMedia = {
        linkedin: updateData.socialMedia.linkedin || '',
        twitter: updateData.socialMedia.twitter || '',
        facebook: updateData.socialMedia.facebook || '',
        instagram: updateData.socialMedia.instagram || '',
      };
    }
    if (updateData.assignedTo !== undefined) {
      updates.assignedTo = updateData.assignedTo ? {
        _type: 'reference',
        _ref: updateData.assignedTo,
      } : undefined;
    }
    if (updateData.lastContactDate !== undefined) updates.lastContactDate = updateData.lastContactDate;
    if (updateData.nextFollowUp !== undefined) updates.nextFollowUp = updateData.nextFollowUp;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    await patch.set(updates).commit();
    
    // Obtener el documento actualizado completo
    const updatedContact = await getContactById(contactId);
    if (!updatedContact) {
      throw new Error('No se pudo obtener el contacto actualizado');
    }
    
    return updatedContact;
  } catch (error) {
    console.error('Error updating contact:', error);
    throw new Error('Error al actualizar el contacto');
  }
};

// Eliminar contacto (soft delete)
export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    await sanityClient
      .patch(contactId)
      .set({
        deletedAt: new Date().toISOString(),
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .commit();
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw new Error('Error al eliminar el contacto');
  }
};

// Restaurar contacto (deshacer soft delete)
export const restoreContact = async (contactId: string): Promise<Contact> => {
  try {
    await sanityClient
      .patch(contactId)
      .set({
        deletedAt: undefined,
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      .unset(['deletedAt'])
      .commit();
    
    // Obtener el documento restaurado completo
    const restoredContact = await getContactById(contactId);
    if (!restoredContact) {
      throw new Error('No se pudo obtener el contacto restaurado');
    }
    
    return restoredContact;
  } catch (error) {
    console.error('Error restoring contact:', error);
    throw new Error('Error al restaurar el contacto');
  }
};

