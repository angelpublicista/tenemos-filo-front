import { sanityClient } from './sanityClient';
import { Company } from '@/types';

export interface CreateCompanyData {
  name: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
  };
}

export const createCompanyInSanity = async (companyData: CreateCompanyData) => {
  try {
    const doc = {
      _type: 'company',
      name: companyData.name,
      slug: {
        _type: 'slug',
        current: companyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      description: companyData.description,
      companyType: companyData.companyType,
      contactInfo: companyData.contactInfo,
      address: companyData.address,
             isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating company in Sanity:', error);
    throw new Error('Failed to create company in Sanity');
  }
};

export const getCompanyById = async (companyId: string): Promise<Company | null> => {
  try {
    const query = `*[_type == "company" && _id == $companyId][0]`;
    const company = await sanityClient.fetch(query, { companyId });
    return company;
  } catch (error) {
    console.error('Error fetching company from Sanity:', error);
    throw new Error('Failed to fetch company from Sanity');
  }
};

export const updateCompanyLocations = async (companyId: string, locationIds: string[]) => {
  try {
    const locationRefs = locationIds.map(id => ({
      _key: crypto.randomUUID(), // Añadir una _key única para cada elemento del array
      _ref: id,
      _type: 'reference',
    }));

    await sanityClient
      .patch(companyId)
      .set({ locations: locationRefs, updatedAt: new Date().toISOString() })
      .commit();
  } catch (error) {
    console.error('Error updating company locations:', error);
    throw new Error('Failed to update company locations');
  }
}; 