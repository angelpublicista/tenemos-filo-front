import { sanityClient } from './sanityClient';
import { 
  Opportunity, 
  CreateOpportunityData, 
  UpdateOpportunityData, 
  OpportunitySearchParams 
} from '@/types';

// Crear una nueva oportunidad
export const createOpportunity = async (opportunityData: CreateOpportunityData): Promise<Opportunity> => {
  try {
    const doc = {
      _type: 'opportunity',
      name: opportunityData.name,
      hostCompany: {
        _type: 'reference',
        _ref: opportunityData.hostCompany,
      },
      crmCompany: opportunityData.crmCompany ? {
        _type: 'reference',
        _ref: opportunityData.crmCompany,
      } : undefined,
      contact: opportunityData.contact ? {
        _type: 'reference',
        _ref: opportunityData.contact,
      } : undefined,
      stage: opportunityData.stage,
      status: opportunityData.status || 'open',
      value: opportunityData.value || undefined,
      currency: opportunityData.currency || 'COP',
      expectedCloseDate: opportunityData.expectedCloseDate || undefined,
      actualCloseDate: opportunityData.actualCloseDate || undefined,
      description: opportunityData.description || '',
      lostReason: opportunityData.lostReason || undefined,
      lostReasonNotes: opportunityData.lostReasonNotes || undefined,
      wonReason: opportunityData.wonReason || undefined,
      source: opportunityData.source || undefined,
      assignedTo: {
        _type: 'reference',
        _ref: opportunityData.assignedTo,
      },
      notes: opportunityData.notes || '',
      tags: opportunityData.tags || [],
      experiences: opportunityData.experiences ? opportunityData.experiences.map(exp => ({
        experience: {
          _type: 'reference',
          _ref: exp.experience,
        },
        quantity: exp.quantity,
        customPrice: exp.customPrice || undefined,
        notes: exp.notes || undefined,
      })) : undefined,
      decisionMakers: opportunityData.decisionMakers ? opportunityData.decisionMakers.map(contactId => ({
        _type: 'reference',
        _ref: contactId,
      })) : undefined,
      isActive: opportunityData.isActive !== undefined ? opportunityData.isActive : true,
      createdBy: {
        _type: 'reference',
        _ref: opportunityData.createdBy,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result as Opportunity;
  } catch (error) {
    console.error('Error creating opportunity:', error);
    throw new Error('Error al crear la oportunidad');
  }
};

// Obtener oportunidad por ID
export const getOpportunityById = async (opportunityId: string): Promise<Opportunity | null> => {
  try {
    const query = `
      *[_type == "opportunity" && _id == $opportunityId && !defined(deletedAt)][0] {
        _id,
        _type,
        name,
        hostCompany,
        crmCompany,
        contact,
        stage,
        status,
        value,
        currency,
        expectedCloseDate,
        actualCloseDate,
        description,
        lostReason,
        lostReasonNotes,
        wonReason,
        source,
        assignedTo,
        notes,
        tags,
        experiences[] {
          experience,
          quantity,
          customPrice,
          notes
        },
        decisionMakers,
        isActive,
        createdBy,
        deletedAt,
        createdAt,
        updatedAt,
        "crmCompanyName": crmCompany->companyName,
        "contactName": contact->firstName + " " + contact->lastName,
        "assignedToName": assignedTo->name,
        "createdByName": createdBy->name
      }
    `;

    const opportunity = await sanityClient.fetch(query, { opportunityId });
    return opportunity as Opportunity | null;
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    throw new Error('Error al obtener la oportunidad');
  }
};

// Obtener oportunidades por empresa anfitriona
export const getOpportunitiesByHost = async (
  hostCompanyId: string,
  searchParams: OpportunitySearchParams = {}
): Promise<Opportunity[]> => {
  try {
    const { query: searchQuery, filters, sortBy = 'createdAt', sortOrder = 'desc', limit } = searchParams;

    let groqQuery = `*[_type == "opportunity" && hostCompany._ref == $hostCompanyId && !defined(deletedAt)`;

    // Filtros
    if (filters) {
      if (filters.stage) {
        groqQuery += ` && stage == $stage`;
      }
      if (filters.status) {
        groqQuery += ` && status == $status`;
      }
      if (filters.source) {
        groqQuery += ` && source == $source`;
      }
      if (filters.assignedTo) {
        groqQuery += ` && assignedTo._ref == $assignedTo`;
      }
      if (filters.crmCompany) {
        groqQuery += ` && crmCompany._ref == $crmCompany`;
      }
      if (filters.isActive !== undefined) {
        groqQuery += ` && isActive == $isActive`;
      }
    }

    // Búsqueda por texto
    if (searchQuery) {
      groqQuery += ` && (name match $searchQuery || description match $searchQuery)`;
    }

    groqQuery += `] {
      _id,
      _type,
      name,
      hostCompany,
      crmCompany,
      contact,
      stage,
      status,
      value,
      currency,
      expectedCloseDate,
      actualCloseDate,
      description,
      lostReason,
      lostReasonNotes,
      wonReason,
      source,
      assignedTo,
      notes,
      tags,
      experiences[] {
        experience,
        quantity,
        customPrice,
        notes
      },
      decisionMakers,
      isActive,
      createdBy,
      deletedAt,
      createdAt,
      updatedAt,
      "crmCompanyName": crmCompany->companyName,
      "contactName": contact->firstName + " " + contact->lastName,
      "assignedToName": assignedTo->name,
      "createdByName": createdBy->name
    }`;

    // Ordenar
    const sortField = sortBy === 'name' ? 'name' : 
                     sortBy === 'value' ? 'value' :
                     sortBy === 'stage' ? 'stage' :
                     sortBy === 'status' ? 'status' :
                     sortBy === 'expectedCloseDate' ? 'expectedCloseDate' :
                     sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    groqQuery += ` | order(${sortField} ${sortOrder})`;

    // Limitar resultados
    if (limit) {
      groqQuery += ` [0...${limit}]`;
    }

    const queryParams: Record<string, unknown> = {
      hostCompanyId,
    };

    if (filters) {
      if (filters.stage) queryParams.stage = filters.stage;
      if (filters.status) queryParams.status = filters.status;
      if (filters.source) queryParams.source = filters.source;
      if (filters.assignedTo) queryParams.assignedTo = filters.assignedTo;
      if (filters.crmCompany) queryParams.crmCompany = filters.crmCompany;
      if (filters.isActive !== undefined) queryParams.isActive = filters.isActive;
    }

    if (searchQuery) {
      queryParams.searchQuery = `*${searchQuery}*`;
    }

    const opportunities = await sanityClient.fetch(groqQuery, queryParams);
    return opportunities || [];
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    throw new Error('Error al obtener las oportunidades');
  }
};

// Actualizar oportunidad
export const updateOpportunity = async (
  opportunityId: string,
  updateData: UpdateOpportunityData
): Promise<Opportunity> => {
  try {
    const updateDoc: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.name !== undefined) updateDoc.name = updateData.name;
    if (updateData.crmCompany !== undefined) {
      updateDoc.crmCompany = updateData.crmCompany ? {
        _type: 'reference',
        _ref: updateData.crmCompany,
      } : null;
    }
    if (updateData.contact !== undefined) {
      updateDoc.contact = updateData.contact ? {
        _type: 'reference',
        _ref: updateData.contact,
      } : null;
    }
    if (updateData.stage !== undefined) updateDoc.stage = updateData.stage;
    if (updateData.status !== undefined) {
      updateDoc.status = updateData.status;
      // Si se marca como ganada o perdida, actualizar fecha de cierre real
      if (updateData.status === 'won' || updateData.status === 'lost') {
        updateDoc.actualCloseDate = new Date().toISOString().split('T')[0];
      }
    }
    if (updateData.value !== undefined) updateDoc.value = updateData.value;
    if (updateData.currency !== undefined) updateDoc.currency = updateData.currency;
    if (updateData.expectedCloseDate !== undefined) updateDoc.expectedCloseDate = updateData.expectedCloseDate;
    if (updateData.actualCloseDate !== undefined) updateDoc.actualCloseDate = updateData.actualCloseDate;
    if (updateData.description !== undefined) updateDoc.description = updateData.description;
    if (updateData.lostReason !== undefined) updateDoc.lostReason = updateData.lostReason;
    if (updateData.lostReasonNotes !== undefined) updateDoc.lostReasonNotes = updateData.lostReasonNotes;
    if (updateData.wonReason !== undefined) updateDoc.wonReason = updateData.wonReason;
    if (updateData.source !== undefined) updateDoc.source = updateData.source;
    if (updateData.assignedTo !== undefined) {
      updateDoc.assignedTo = {
        _type: 'reference',
        _ref: updateData.assignedTo,
      };
    }
    if (updateData.notes !== undefined) updateDoc.notes = updateData.notes;
    if (updateData.tags !== undefined) updateDoc.tags = updateData.tags;
    if (updateData.experiences !== undefined) {
      updateDoc.experiences = updateData.experiences.map(exp => ({
        experience: {
          _type: 'reference',
          _ref: exp.experience,
        },
        quantity: exp.quantity,
        customPrice: exp.customPrice || undefined,
        notes: exp.notes || undefined,
      }));
    }
    if (updateData.decisionMakers !== undefined) {
      updateDoc.decisionMakers = updateData.decisionMakers.map(contactId => ({
        _type: 'reference',
        _ref: contactId,
      }));
    }
    if (updateData.isActive !== undefined) updateDoc.isActive = updateData.isActive;

    await sanityClient
      .patch(opportunityId)
      .set(updateDoc)
      .commit();

    // Obtener la oportunidad actualizada para retornar el tipo correcto
    const updatedOpportunity = await getOpportunityById(opportunityId);
    if (!updatedOpportunity) {
      throw new Error('Error al obtener la oportunidad actualizada');
    }
    return updatedOpportunity;
  } catch (error) {
    console.error('Error updating opportunity:', error);
    throw new Error('Error al actualizar la oportunidad');
  }
};

// Eliminar oportunidad (soft delete)
export const deleteOpportunity = async (opportunityId: string): Promise<void> => {
  try {
    await sanityClient
      .patch(opportunityId)
      .set({
        deletedAt: new Date().toISOString(),
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .commit();
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    throw new Error('Error al eliminar la oportunidad');
  }
};

