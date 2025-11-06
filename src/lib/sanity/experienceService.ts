import { sanityClient } from './sanityClient';
import { Experience, CreateExperienceData, UpdateExperienceData, ExperienceSearchParams } from '@/types';

// Crear una nueva experiencia
export const createExperienceInSanity = async (experienceData: CreateExperienceData) => {
  try {
    const doc = {
      _type: 'experience',
      title: experienceData.title,
      slug: {
        _type: 'slug',
        current: experienceData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      company: {
        _ref: experienceData.company,
        _type: 'reference',
      },
      description: experienceData.description,
      categories: experienceData.categories,
      duration: experienceData.duration,
      capacity: experienceData.capacity,
      minCapacity: experienceData.minCapacity,
      basePrice: experienceData.basePrice,
      currency: experienceData.currency,
      featuredImage: experienceData.featuredImage ? {
        _type: 'image',
        asset: {
          _ref: experienceData.featuredImage,
          _type: 'reference',
        },
      } : undefined,
      gallery: experienceData.gallery?.map((img, index) => ({
        _key: `gallery-${index}-${Date.now()}`,
        _type: 'image',
        asset: {
          _ref: img.assetId,
          _type: 'reference',
        },
        alt: img.alt || '',
        caption: img.caption || '',
      })),
      locations: experienceData.locations?.map((locationId, index) => ({
        _key: `location-${index}-${Date.now()}`,
        _ref: locationId,
        _type: 'reference',
      })) || [],
      availabilities: experienceData.availabilities?.map((availabilityId, index) => ({
        _key: `availability-${index}-${Date.now()}`,
        _ref: availabilityId,
        _type: 'reference',
      })) || [],
      experienceType: experienceData.experienceType,
      isVirtual: experienceData.isVirtual,
      virtualPlatform: experienceData.virtualPlatform,
      presentialLocation: experienceData.presentialLocation,
      presentialAddress: experienceData.presentialAddress,
      presentialCity: experienceData.presentialCity,
      requirements: experienceData.requirements,
      includes: experienceData.includes,
      addons: experienceData.addons?.map((addon, index) => ({
        _key: `addon-${index}`,
        name: addon.name,
        price: addon.price,
        priceType: addon.priceType,
        description: addon.description,
      })),
      status: experienceData.status || 'draft',
      isFeatured: experienceData.isFeatured || false,
      rating: 0,
      totalBookings: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating experience in Sanity:', error);
    throw new Error('Failed to create experience in Sanity');
  }
};

// Obtener todas las experiencias con filtros
export const getExperiences = async (searchParams: ExperienceSearchParams = {}): Promise<Experience[]> => {
  try {
    const {
      query = '',
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = searchParams;

    let groqQuery = `*[_type == "experience"`;
    
    // Filtros
    if (query) {
      groqQuery += ` && (title match "*${query}*" || description match "*${query}*")`;
    }
    
    if (filters.category) {
      groqQuery += ` && category == "${filters.category}"`;
    }
    
    if (filters.status) {
      groqQuery += ` && status == "${filters.status}"`;
    }
    
    if (filters.minPrice !== undefined) {
      groqQuery += ` && basePrice >= ${filters.minPrice}`;
    }
    
    if (filters.maxPrice !== undefined) {
      groqQuery += ` && basePrice <= ${filters.maxPrice}`;
    }
    
    if (filters.duration !== undefined) {
      groqQuery += ` && duration == ${filters.duration}`;
    }
    
    if (filters.experienceType) {
      groqQuery += ` && experienceType == "${filters.experienceType}"`;
    }
    
    if (filters.isFeatured !== undefined) {
      groqQuery += ` && isFeatured == ${filters.isFeatured}`;
    }

    groqQuery += `]`;

    // Ordenamiento
    const sortField = sortBy === 'price' ? 'basePrice' : sortBy;
    groqQuery += ` | order(${sortField} ${sortOrder})`;

    // Paginación
    const start = (page - 1) * limit;
    const end = start + limit;
    groqQuery += `[${start}...${end}]`;

    // Campos a obtener
    groqQuery += `{
      _id,
      _type,
      title,
      slug,
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      description,
      categories,
      duration,
      capacity,
      minCapacity,
      basePrice,
      currency,
      images,
      location->{
        _id,
        name,
        address
      },
      experienceType,
      virtualPlatform,
      presentialLocation,
      presentialAddress,
      presentialCity,
      availability,
      requirements,
      includes,
      addons,
      status,
      isFeatured,
      rating,
      totalBookings,
      totalRevenue,
      createdAt,
      updatedAt
    }`;

    const experiences = await sanityClient.fetch(groqQuery);
    return experiences;
  } catch (error) {
    console.error('Error fetching experiences:', error);
    throw new Error('Failed to fetch experiences');
  }
};

// Obtener experiencias por empresa
export const getExperiencesByCompany = async (companyId: string): Promise<Experience[]> => {
  try {
    const query = `*[_type == "experience" && company._ref == $companyId] | order(createdAt desc) {
      _id,
      _type,
      title,
      slug,
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      description,
      categories,
      duration,
      capacity,
      minCapacity,
      basePrice,
      currency,
      images,
      "locations": locations[]->{
        _id,
        name,
        address,
        isMain
      },
      "availabilitySchedules": availabilities[]->{
        _id,
        name,
        weeklySchedule,
        bufferTime,
        minimumNotice,
        blockedDates,
        location
      },
      experienceType,
      isVirtual,
      virtualPlatform,
      presentialLocation,
      presentialAddress,
      presentialCity,
      requirements,
      includes,
      addons,
      status,
      isFeatured,
      rating,
      totalBookings,
      totalRevenue,
      createdAt,
      updatedAt
    }`;

    const experiences = await sanityClient.fetch(query, { companyId });
    return experiences;
  } catch (error) {
    console.error('Error fetching experiences by company:', error);
    throw new Error('Failed to fetch experiences by company');
  }
};

// Obtener experiencia por ID
export const getExperienceById = async (experienceId: string): Promise<Experience | null> => {
  try {
    const query = `*[_type == "experience" && _id == $experienceId][0] {
      _id,
      _type,
      title,
      slug,
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      description,
      categories,
      duration,
      capacity,
      minCapacity,
      basePrice,
      currency,
      "featuredImage": select(
        defined(featuredImage.asset._ref) => featuredImage.asset._ref,
        null
      ),
      "gallery": select(
        defined(gallery) => gallery[]{
          "assetId": asset._ref,
          alt,
          caption
        },
        []
      ),
      images,
      "locations": locations[]->{
        _id,
        name,
        address,
        isMain,
        capacity
      },
      "availabilitySchedules": availabilities[]->{
        _id,
        name,
        weeklySchedule,
        bufferTime,
        minimumNotice,
        blockedDates,
        location
      },
      experienceType,
      isVirtual,
      virtualPlatform,
      presentialLocation,
      presentialAddress,
      presentialCity,
      requirements,
      includes,
      addons,
      status,
      isFeatured,
      rating,
      totalBookings,
      totalRevenue,
      createdAt,
      updatedAt
    }`;

    const experience = await sanityClient.fetch(query, { experienceId });
    return experience;
  } catch (error) {
    console.error('Error fetching experience by ID:', error);
    throw new Error('Failed to fetch experience by ID');
  }
};

// Actualizar experiencia
export const updateExperienceInSanity = async (experienceData: UpdateExperienceData) => {
  try {
    const updateData: Record<string, unknown> = {
      title: experienceData.title,
      description: experienceData.description,
      categories: experienceData.categories,
      duration: experienceData.duration,
      capacity: experienceData.capacity,
      minCapacity: experienceData.minCapacity,
      basePrice: experienceData.basePrice,
      currency: experienceData.currency,
      experienceType: experienceData.experienceType,
      isVirtual: experienceData.isVirtual,
      virtualPlatform: experienceData.virtualPlatform,
      presentialLocation: experienceData.presentialLocation,
      presentialAddress: experienceData.presentialAddress,
      presentialCity: experienceData.presentialCity,
      requirements: experienceData.requirements,
      includes: experienceData.includes,
      status: experienceData.status,
      isFeatured: experienceData.isFeatured,
      updatedAt: new Date().toISOString(),
    };

    // Actualizar slug si cambió el título
    if (experienceData.title) {
      updateData.slug = {
        _type: 'slug',
        current: experienceData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      };
    }

    // Actualizar imagen destacada si se proporcionó
    if (experienceData.featuredImage) {
      updateData.featuredImage = {
        _type: 'image',
        asset: {
          _ref: experienceData.featuredImage,
          _type: 'reference',
        },
      };
    }

    // Actualizar galería si se proporcionó
    if (experienceData.gallery) {
      updateData.gallery = experienceData.gallery.map((img, index) => ({
        _key: `gallery-${index}-${Date.now()}`,
        _type: 'image',
        asset: {
          _ref: img.assetId,
          _type: 'reference',
        },
        alt: img.alt || '',
        caption: img.caption || '',
      }));
    }

    // Actualizar imágenes (compatibilidad con versión anterior)
    if (experienceData.images) {
      updateData.images = experienceData.images.map((url, index) => ({
        _key: `image-${index}`,
        _type: 'image',
        asset: {
          _ref: url,
          _type: 'reference',
        },
      }));
    }

    // Actualizar ubicaciones si se proporcionaron (múltiples sedes)
    if (experienceData.locations && experienceData.locations.length > 0) {
      updateData.locations = experienceData.locations.map((locationId, index) => ({
        _key: `location-${index}-${Date.now()}`,
        _ref: locationId,
        _type: 'reference',
      }));
    }

    // Actualizar calendarios de disponibilidad si se proporcionaron (múltiples calendarios)
    if (experienceData.availabilities && experienceData.availabilities.length > 0) {
      updateData.availabilities = experienceData.availabilities.map((availabilityId, index) => ({
        _key: `availability-${index}-${Date.now()}`,
        _ref: availabilityId,
        _type: 'reference',
      }));
    }

    // Actualizar addons si se proporcionaron
    if (experienceData.addons) {
      updateData.addons = experienceData.addons.map((addon, index) => ({
        _key: `addon-${index}`,
        name: addon.name,
        price: addon.price,
        priceType: addon.priceType,
        description: addon.description,
      }));
    }

    // Actualizar documento y limpiar campos antiguos del schema
    const result = await sanityClient
      .patch(experienceData._id)
      .set(updateData)
      .unset(['location', 'availabilitySchedule', 'category']) // Eliminar campos antiguos
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating experience in Sanity:', error);
    throw new Error('Failed to update experience in Sanity');
  }
};

// Eliminar experiencia
export const deleteExperienceInSanity = async (experienceId: string) => {
  try {
    const result = await sanityClient.delete(experienceId);
    return result;
  } catch (error) {
    console.error('Error deleting experience in Sanity:', error);
    throw new Error('Failed to delete experience in Sanity');
  }
};

// Cambiar estado de experiencia
export const updateExperienceStatus = async (experienceId: string, status: Experience['status']) => {
  try {
    const result = await sanityClient
      .patch(experienceId)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating experience status:', error);
    throw new Error('Failed to update experience status');
  }
};

// Obtener experiencias destacadas
export const getFeaturedExperiences = async (limit: number = 6): Promise<Experience[]> => {
  try {
    const query = `*[_type == "experience" && isFeatured == true && status == "active"] | order(rating desc, totalBookings desc) [0...${limit}] {
      _id,
      _type,
      title,
      slug,
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      description,
      categories,
      duration,
      capacity,
      minCapacity,
      basePrice,
      currency,
      images,
      location->{
        _id,
        name,
        address
      },
      experienceType,
      virtualPlatform,
      presentialLocation,
      presentialAddress,
      presentialCity,
      availability,
      requirements,
      includes,
      addons,
      status,
      isFeatured,
      rating,
      totalBookings,
      totalRevenue,
      createdAt,
      updatedAt
    }`;

    const experiences = await sanityClient.fetch(query);
    return experiences;
  } catch (error) {
    console.error('Error fetching featured experiences:', error);
    throw new Error('Failed to fetch featured experiences');
  }
};

// Obtener estadísticas de experiencias por empresa
export const getExperienceStatsByCompany = async (companyId: string) => {
  try {
    const query = `*[_type == "experience" && company._ref == $companyId] {
      status,
      totalBookings,
      totalRevenue,
      rating
    }`;

    const experiences = await sanityClient.fetch(query, { companyId });
    
    const stats = {
      total: experiences.length,
      active: experiences.filter((e: Record<string, unknown>) => e.status === 'active').length,
      draft: experiences.filter((e: Record<string, unknown>) => e.status === 'draft').length,
      pending: experiences.filter((e: Record<string, unknown>) => e.status === 'pending').length,
      paused: experiences.filter((e: Record<string, unknown>) => e.status === 'paused').length,
      inactive: experiences.filter((e: Record<string, unknown>) => e.status === 'inactive').length,
      totalBookings: experiences.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.totalBookings as number) || 0), 0),
      totalRevenue: experiences.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.totalRevenue as number) || 0), 0),
      averageRating: experiences.length > 0 
        ? experiences.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.rating as number) || 0), 0) / experiences.length 
        : 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching experience stats by company:', error);
    throw new Error('Failed to fetch experience stats by company');
  }
};
