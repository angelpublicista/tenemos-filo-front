// Reescrito sobre el API. Conserva las firmas de las funciones publicas
// para no tocar los callers (dashboard/locations, dashboard/availability,
// CompanySetupForm, etc.). El shape de retorno se mantiene "Sanity-like".
import { api } from '@/lib/api/client';
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

interface ApiLocation {
  id: string;
  companyId: string;
  name: string;
  slug: string | null;
  description: string | null;
  address: Location['address'] | null;
  contactInfo: Location['contactInfo'] | null;
  capacity: Location['capacity'] | null;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toLocation(l: ApiLocation): Location {
  return {
    _id: l.id,
    _type: 'location',
    name: l.name,
    slug: { _type: 'slug', current: l.slug ?? '' },
    company: { _ref: l.companyId, _type: 'reference' },
    isMain: l.isMain,
    description: l.description ?? undefined,
    address: l.address ?? { street: '', city: '' },
    contactInfo: l.contactInfo ?? undefined,
    capacity: l.capacity ?? undefined,
    isActive: l.isActive,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export const createLocationInSanity = async (data: CreateLocationData) => {
  const created = await api.post<ApiLocation>('/locations', {
    name: data.name,
    companyId: data.companyId,
    isMain: data.isMain,
    description: data.description,
    address: data.address,
    contactInfo: data.contactInfo,
    capacity: data.capacity,
    isActive: data.isActive,
  });
  return toLocation(created);
};

export const getLocationById = async (locationId: string): Promise<Location | null> => {
  try {
    const loc = await api.get<ApiLocation>(`/locations/${encodeURIComponent(locationId)}`);
    return toLocation(loc);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const getLocationsByCompany = async (companyId: string): Promise<Location[]> => {
  const items = await api.get<ApiLocation[]>('/locations', { companyId });
  return items.map(toLocation);
};

export const updateLocationInSanity = async (
  locationId: string,
  updateData: Partial<CreateLocationData>,
): Promise<Location> => {
  const updated = await api.patch<ApiLocation>(`/locations/${encodeURIComponent(locationId)}`, {
    name: updateData.name,
    isMain: updateData.isMain,
    description: updateData.description,
    address: updateData.address,
    contactInfo: updateData.contactInfo,
    capacity: updateData.capacity,
    isActive: updateData.isActive,
  });
  return toLocation(updated);
};

export const deleteLocationInSanity = async (locationId: string): Promise<void> => {
  await api.delete(`/locations/${encodeURIComponent(locationId)}`);
};

export const setMainLocation = async (
  locationId: string,
  _companyId: string,
): Promise<void> => {
  // El API resuelve la company por el JWT del user; el companyId viejo se ignora.
  void _companyId;
  await api.post(`/locations/${encodeURIComponent(locationId)}/set-main`);
};
