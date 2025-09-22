import { sanityClient } from './sanityClient';
import { Company } from '@/types';

export interface CreateCompanyData {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
  // Campos fiscales y empresariales
  documentType?: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber?: string;
  businessName?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  employeeCount?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annualRevenue?: '0-100k' | '100k-500k' | '500k-1M' | '1M-5M' | '5M+';
  businessYears?: '0-1' | '1-3' | '3-5' | '5-10' | '10+';
}

export const createCompanyInSanity = async (companyData: CreateCompanyData) => {
  try {
    const doc = {
      _type: 'company',
      companyName: companyData.companyName,
      slug: {
        _type: 'slug',
        current: companyData.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      businessName: companyData.businessName,
      description: companyData.description,
      companyType: companyData.companyType,
      companyEmail: companyData.companyEmail,
      companyPhone: companyData.companyPhone,
      documentType: companyData.documentType,
      documentNumber: companyData.documentNumber,
      website: companyData.website,
      address: companyData.address,
      employeeCount: companyData.employeeCount,
      annualRevenue: companyData.annualRevenue,
      businessYears: companyData.businessYears,
      isActive: true,
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

export const getCompanyByUserId = async (firebaseId: string): Promise<Company | null> => {
  try {
    // Primero obtener el usuario para acceder a su empresa
    const userQuery = `*[_type == "user" && firebaseId == $firebaseId][0]`;
    const user = await sanityClient.fetch(userQuery, { firebaseId });
    
    if (!user || !user.company) {
      return null;
    }

    // Obtener la empresa del usuario
    const companyId = user.company._ref;
    const companyQuery = `*[_type == "company" && _id == $companyId][0]`;
    const company = await sanityClient.fetch(companyQuery, { companyId });
    
    return company;
  } catch (error) {
    console.error('Error fetching company by user ID:', error);
    throw new Error('Failed to fetch company by user ID');
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