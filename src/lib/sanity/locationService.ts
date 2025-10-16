import { sanityClient } from './sanityClient';
import { Location } from '@/types';

export interface CreateLocationData {
  name: string;
  companyId: string;
  isMain: boolean;
  description?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  capacity?: {
    minGuests?: number;
    maxGuests?: number;
  };
  isActive?: boolean;
}

export const createLocationInSanity = async (locationData: CreateLocationData) => {
  try {
    const doc = {
      _type: 'location',
      name: locationData.name,
      slug: {
        _type: 'slug',
        current: locationData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      company: {
        _ref: locationData.companyId,
        _type: 'reference',
      },
      isMain: locationData.isMain,
      description: locationData.description,
      address: locationData.address,
      contactInfo: locationData.contactInfo,
      capacity: locationData.capacity,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating location in Sanity:', error);
    throw new Error('Failed to create location in Sanity');
  }
};

export const getLocationById = async (locationId: string): Promise<Location | null> => {
  try {
    const query = `*[_type == "location" && _id == $locationId][0]`;
    const location = await sanityClient.fetch(query, { locationId });
    return location;
  } catch (error) {
    console.error('Error fetching location from Sanity:', error);
    throw new Error('Failed to fetch location from Sanity');
  }
};

export const getLocationsByCompany = async (companyId: string): Promise<Location[]> => {
  try {
    const query = `*[_type == "location" && company._ref == $companyId && deletedAt == null] | order(isMain desc, name asc)`;
    const locations = await sanityClient.fetch(query, { companyId });
    return locations;
  } catch (error) {
    console.error('Error fetching locations by company:', error);
    throw new Error('Failed to fetch locations by company');
  }
};

/**
 * Actualiza una sede existente
 */
export const updateLocationInSanity = async (
  locationId: string,
  updateData: Partial<CreateLocationData>
): Promise<Location> => {
  try {
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.isMain !== undefined) updates.isMain = updateData.isMain;
    if (updateData.address !== undefined) updates.address = updateData.address;
    if (updateData.contactInfo !== undefined) updates.contactInfo = updateData.contactInfo;
    if (updateData.capacity !== undefined) updates.capacity = updateData.capacity;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    const result = await sanityClient.patch(locationId).set(updates).commit();
    return result as unknown as Location;
  } catch (error) {
    console.error('Error updating location in Sanity:', error);
    throw new Error('Failed to update location in Sanity');
  }
};

/**
 * Elimina una sede (soft delete)
 */
export const deleteLocationInSanity = async (locationId: string): Promise<void> => {
  try {
    await sanityClient
      .patch(locationId)
      .set({ 
        deletedAt: new Date().toISOString(),
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .commit();
  } catch (error) {
    console.error('Error deleting location in Sanity:', error);
    throw new Error('Failed to delete location in Sanity');
  }
};

/**
 * Establece una sede como principal (desactiva las demás principales de la empresa)
 */
export const setMainLocation = async (
  locationId: string,
  companyId: string
): Promise<void> => {
  try {
    // Primero, desactivar todas las sedes principales de esta empresa
    const currentMainQuery = `*[_type == "location" && company._ref == $companyId && isMain == true && deletedAt == null]`;
    const currentMain = await sanityClient.fetch(currentMainQuery, { companyId });

    if (currentMain && currentMain.length > 0) {
      const transaction = sanityClient.transaction();
      currentMain.forEach((location: Location) => {
        transaction.patch(location._id, { set: { isMain: false } });
      });
      await transaction.commit();
    }

    // Luego, establecer la nueva sede como principal
    await sanityClient
      .patch(locationId)
      .set({ 
        isMain: true, 
        updatedAt: new Date().toISOString() 
      })
      .commit();
  } catch (error) {
    console.error('Error setting main location:', error);
    throw new Error('Failed to set main location');
  }
}; 