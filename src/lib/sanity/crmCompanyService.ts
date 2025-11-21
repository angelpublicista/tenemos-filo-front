import { sanityClient } from './sanityClient';
import { 
  CRMCompany, 
  CreateCRMCompanyData, 
  UpdateCRMCompanyData, 
  CRMCompanySearchParams 
} from '@/types';

// Crear una nueva empresa CRM
export const createCRMCompany = async (companyData: CreateCRMCompanyData): Promise<CRMCompany> => {
  try {
    const doc = {
      _type: 'crmCompany',
      hostCompany: {
        _type: 'reference',
        _ref: companyData.hostCompany,
      },
      companyName: companyData.companyName,
      businessName: companyData.businessName || '',
      companyType: companyData.companyType,
      industry: companyData.industry || '',
      description: companyData.description || '',
      email: companyData.email || '',
      phone: companyData.phone || '',
      website: companyData.website || '',
      documentType: companyData.documentType || 'nit',
      documentNumber: companyData.documentNumber || '',
      address: companyData.address ? {
        street: companyData.address.street || '',
        city: companyData.address.city || '',
        state: companyData.address.state || '',
        postalCode: companyData.address.postalCode || '',
        country: companyData.address.country || 'CO',
      } : undefined,
      employeeCount: companyData.employeeCount || '',
      annualRevenue: companyData.annualRevenue || '',
      logo: companyData.logo ? {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: companyData.logo,
        },
      } : undefined,
      status: companyData.status || 'active',
      source: companyData.source || '',
      notes: companyData.notes || '',
      tags: companyData.tags || [],
      socialMedia: companyData.socialMedia ? {
        linkedin: companyData.socialMedia.linkedin || '',
        twitter: companyData.socialMedia.twitter || '',
        facebook: companyData.socialMedia.facebook || '',
        instagram: companyData.socialMedia.instagram || '',
      } : undefined,
      assignedTo: companyData.assignedTo ? {
        _type: 'reference',
        _ref: companyData.assignedTo,
      } : undefined,
      lastContactDate: companyData.lastContactDate || undefined,
      nextFollowUp: companyData.nextFollowUp || undefined,
      isActive: companyData.isActive !== undefined ? companyData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result as CRMCompany;
  } catch (error) {
    console.error('Error creating CRM company:', error);
    throw new Error('Error al crear la empresa CRM');
  }
};

// Obtener empresa CRM por ID
export const getCRMCompanyById = async (companyId: string): Promise<CRMCompany | null> => {
  try {
    const query = `
      *[_type == "crmCompany" && _id == $companyId && !defined(deletedAt)][0] {
        _id,
        _type,
        hostCompany,
        companyName,
        businessName,
        companyType,
        industry,
        description,
        email,
        phone,
        website,
        documentType,
        documentNumber,
        address,
        employeeCount,
        annualRevenue,
        logo,
        status,
        source,
        notes,
        tags,
        socialMedia,
        assignedTo,
        lastContactDate,
        nextFollowUp,
        isActive,
        deletedAt,
        createdAt,
        updatedAt,
        "hostCompanyName": hostCompany->companyName,
        "assignedToName": assignedTo->name
      }
    `;

    const company = await sanityClient.fetch(query, { companyId });
    return company || null;
  } catch (error) {
    console.error('Error fetching CRM company:', error);
    throw new Error('Error al obtener la empresa CRM');
  }
};

// Obtener empresas CRM por empresa anfitriona
export const getCRMCompaniesByHost = async (
  hostCompanyId: string,
  searchParams: CRMCompanySearchParams = {}
): Promise<CRMCompany[]> => {
  try {
    const { query: searchQuery, filters, sortBy = 'createdAt', sortOrder = 'desc', limit = 50 } = searchParams;

    let groqQuery = `
      *[_type == "crmCompany" 
        && hostCompany._ref == $hostCompanyId
        && !defined(deletedAt)
    `;

    // Aplicar filtros
    if (filters) {
      if (filters.companyType) {
        groqQuery += ` && companyType == $companyType`;
      }
      if (filters.status) {
        groqQuery += ` && status == $status`;
      }
      if (filters.industry) {
        groqQuery += ` && industry == $industry`;
      }
      if (filters.source) {
        groqQuery += ` && source == $source`;
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
        companyName match $searchQuery ||
        businessName match $searchQuery ||
        email match $searchQuery ||
        phone match $searchQuery ||
        description match $searchQuery
      )`;
    }

    groqQuery += `] {
      _id,
      _type,
      hostCompany,
      companyName,
      businessName,
      companyType,
      industry,
      description,
      email,
      phone,
      website,
      documentType,
      documentNumber,
      address,
      employeeCount,
      annualRevenue,
      logo,
      status,
      source,
      notes,
      tags,
      socialMedia,
      assignedTo,
      lastContactDate,
      nextFollowUp,
      isActive,
      deletedAt,
      createdAt,
      updatedAt,
      "hostCompanyName": hostCompany->companyName,
      "assignedToName": assignedTo->name
    }`;

    // Ordenar
    const sortField = sortBy === 'companyName' ? 'companyName' : 
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
      if (filters.companyType) queryParams.companyType = filters.companyType;
      if (filters.status) queryParams.status = filters.status;
      if (filters.industry) queryParams.industry = filters.industry;
      if (filters.source) queryParams.source = filters.source;
      if (filters.assignedTo) queryParams.assignedTo = filters.assignedTo;
      if (filters.isActive !== undefined) queryParams.isActive = filters.isActive;
    }

    if (searchQuery) {
      queryParams.searchQuery = `*${searchQuery}*`;
    }

    const companies = await sanityClient.fetch(groqQuery, queryParams);
    return companies || [];
  } catch (error) {
    console.error('Error fetching CRM companies:', error);
    throw new Error('Error al obtener las empresas CRM');
  }
};

// Actualizar empresa CRM
export const updateCRMCompany = async (
  companyId: string,
  updateData: UpdateCRMCompanyData
): Promise<CRMCompany> => {
  try {
    const patch = sanityClient.patch(companyId);

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.companyName !== undefined) updates.companyName = updateData.companyName;
    if (updateData.businessName !== undefined) updates.businessName = updateData.businessName;
    if (updateData.companyType !== undefined) updates.companyType = updateData.companyType;
    if (updateData.industry !== undefined) updates.industry = updateData.industry;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.email !== undefined) updates.email = updateData.email;
    if (updateData.phone !== undefined) updates.phone = updateData.phone;
    if (updateData.website !== undefined) updates.website = updateData.website;
    if (updateData.documentType !== undefined) updates.documentType = updateData.documentType;
    if (updateData.documentNumber !== undefined) updates.documentNumber = updateData.documentNumber;
    if (updateData.address !== undefined) {
      updates.address = {
        street: updateData.address.street || '',
        city: updateData.address.city || '',
        state: updateData.address.state || '',
        postalCode: updateData.address.postalCode || '',
        country: updateData.address.country || 'CO',
      };
    }
    if (updateData.employeeCount !== undefined) updates.employeeCount = updateData.employeeCount;
    if (updateData.annualRevenue !== undefined) updates.annualRevenue = updateData.annualRevenue;
    if (updateData.logo !== undefined) {
      updates.logo = updateData.logo ? {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: updateData.logo,
        },
      } : undefined;
    }
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.source !== undefined) updates.source = updateData.source;
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
    const updatedCompany = await getCRMCompanyById(companyId);
    if (!updatedCompany) {
      throw new Error('No se pudo obtener la empresa actualizada');
    }
    
    return updatedCompany;
  } catch (error) {
    console.error('Error updating CRM company:', error);
    throw new Error('Error al actualizar la empresa CRM');
  }
};

// Eliminar empresa CRM (soft delete)
export const deleteCRMCompany = async (companyId: string): Promise<void> => {
  try {
    await sanityClient
      .patch(companyId)
      .set({
        deletedAt: new Date().toISOString(),
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .commit();
  } catch (error) {
    console.error('Error deleting CRM company:', error);
    throw new Error('Error al eliminar la empresa CRM');
  }
};

// Restaurar empresa CRM (deshacer soft delete)
export const restoreCRMCompany = async (companyId: string): Promise<CRMCompany> => {
  try {
    await sanityClient
      .patch(companyId)
      .set({
        deletedAt: undefined,
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      .unset(['deletedAt'])
      .commit();
    
    // Obtener el documento restaurado completo
    const restoredCompany = await getCRMCompanyById(companyId);
    if (!restoredCompany) {
      throw new Error('No se pudo obtener la empresa restaurada');
    }
    
    return restoredCompany;
  } catch (error) {
    console.error('Error restoring CRM company:', error);
    throw new Error('Error al restaurar la empresa CRM');
  }
};

