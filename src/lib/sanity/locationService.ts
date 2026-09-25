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
  /** Obligatoria: cuanta gente cabe a la vez. */
  maxCapacity?: number;
  isPublic?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  responsibleContactId?: string | null;
  photos?: string[];
  videoUrl?: string | null;
  amenities?: string[];
  avEquipmentDetail?: string | null;
  bathroomsCount?: number | null;
  importantInfo?: string | null;
  hasRooms?: boolean | null;
  rooms?: Array<{
    id?: string;
    name: string;
    description?: string;
    maxCapacity: number;
    photos?: string[];
    isActive?: boolean;
  }>;
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
  maxCapacity: number | null;
  isPublic: boolean | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[] | null;
  videoUrl: string | null;
  amenities: string[] | null;
  avEquipmentDetail: string | null;
  bathroomsCount: number | null;
  importantInfo: string | null;
  hasRooms: boolean | null;
  rooms?: Array<{
    id: string;
    name: string;
    description: string | null;
    maxCapacity: number;
    photos: string[];
    isActive: boolean;
  }> | null;
  responsibleContactId: string | null;
  responsibleContact: {
    id: string;
    name: string;
    type: 'RESERVAS' | 'CONTABILIDAD' | 'OTRO';
    label: string | null;
    phone: string | null;
    position: string | null;
  } | null;
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
    maxCapacity: l.maxCapacity ?? undefined,
    isPublic: l.isPublic,
    latitude: l.latitude,
    longitude: l.longitude,
    photos: l.photos ?? [],
    videoUrl: l.videoUrl,
    amenities: l.amenities ?? [],
    avEquipmentDetail: l.avEquipmentDetail,
    bathroomsCount: l.bathroomsCount,
    importantInfo: l.importantInfo,
    hasRooms: l.hasRooms,
    rooms: (l.rooms ?? []).map((r) => ({ ...r, photos: r.photos ?? [] })),
    responsibleContactId: l.responsibleContactId,
    responsibleContact: l.responsibleContact
      ? {
          ...l.responsibleContact,
          type: l.responsibleContact.type.toLowerCase() as 'reservas' | 'contabilidad' | 'otro',
        }
      : null,
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
    maxCapacity: data.maxCapacity,
    isPublic: data.isPublic,
    latitude: data.latitude,
    longitude: data.longitude,
    responsibleContactId: data.responsibleContactId,
    photos: data.photos,
    videoUrl: data.videoUrl,
    amenities: data.amenities,
    avEquipmentDetail: data.avEquipmentDetail,
    bathroomsCount: data.bathroomsCount,
    importantInfo: data.importantInfo,
    hasRooms: data.hasRooms,
    rooms: data.rooms,
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
    maxCapacity: updateData.maxCapacity,
    isPublic: updateData.isPublic,
    latitude: updateData.latitude,
    longitude: updateData.longitude,
    responsibleContactId: updateData.responsibleContactId,
    photos: updateData.photos,
    videoUrl: updateData.videoUrl,
    amenities: updateData.amenities,
    avEquipmentDetail: updateData.avEquipmentDetail,
    bathroomsCount: updateData.bathroomsCount,
    importantInfo: updateData.importantInfo,
    hasRooms: updateData.hasRooms,
    rooms: updateData.rooms,
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
