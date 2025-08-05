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
             isActive: false,
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
    const query = `*[_type == "location" && company._ref == $companyId] | order(isMain desc, name asc)`;
    const locations = await sanityClient.fetch(query, { companyId });
    return locations;
  } catch (error) {
    console.error('Error fetching locations by company:', error);
    throw new Error('Failed to fetch locations by company');
  }
}; 