import { sanityClient } from './sanityClient';
import { api } from '@/lib/api/client';
import { CreateUserData, SanityUser } from '@/types';

// Función para probar la conectividad con Sanity
export const testSanityConnection = async () => {
  try {
    console.log('Probando conexión con Sanity...');
    console.log('Project ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
    console.log('Dataset:', process.env.NEXT_PUBLIC_SANITY_DATASET);
    console.log('Token configurado:', !!process.env.NEXT_PUBLIC_SANITY_TOKEN);
    
    // Intentar hacer una consulta simple para verificar permisos de lectura
    await sanityClient.fetch('*[_type == "user"] | order(_createdAt desc)[0]');
    console.log('Conexión exitosa con Sanity');
    return { success: true, message: 'Conexión exitosa' };
  } catch (error) {
    console.error('Error de conexión con Sanity:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
};

export const checkUserExistsByEmail = async (email: string): Promise<boolean> => {
  try {
    const query = `*[_type == "user" && email == $email][0]`;
    const user = await sanityClient.fetch(query, { email });
    return !!user;
  } catch (error) {
    console.error('Error checking user by email:', error);
    throw new Error('Failed to check user by email');
  }
};

export const checkUserExistsByDocument = async (documentNumber: string): Promise<boolean> => {
  try {
    const query = `*[_type == "user" && documentNumber == $documentNumber][0]`;
    const user = await sanityClient.fetch(query, { documentNumber });
    return !!user;
  } catch (error) {
    console.error('Error checking user by document:', error);
    throw new Error('Failed to check user by document');
  }
};

export const createUserInSanity = async (userData: CreateUserData) => {
  try {
    // Verificar duplicados antes de crear
    const emailExists = await checkUserExistsByEmail(userData.email);
    if (emailExists) {
      throw new Error('Ya existe un usuario registrado con este email');
    }

    const documentExists = await checkUserExistsByDocument(userData.documentNumber);
    if (documentExists) {
      throw new Error('Ya existe un usuario registrado con este número de documento');
    }

    const doc = {
      _type: 'user',
      firebaseId: userData.firebaseId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone,
      typeDocument: userData.typeDocument,
      documentNumber: userData.documentNumber,
      // hasCompletedCompanySetup se maneja en localStorage, no en Sanity
      isActive: true, // Usuarios activos por defecto
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Intentando crear usuario en Sanity con datos:', {
      ...doc,
      firebaseId: doc.firebaseId.substring(0, 8) + '...' // Solo mostrar parte del ID por seguridad
    });

    const result = await sanityClient.create(doc);
    console.log('Usuario creado exitosamente en Sanity:', result._id);
    return result;
  } catch (error) {
    console.error('Error creating user in Sanity:', error);
    
    // Manejar errores específicos de permisos
    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        throw new Error('Error de permisos en Sanity: Verifica que el token de API tenga permisos de escritura');
      } else if (error.message.includes('token')) {
        throw new Error('Error de autenticación en Sanity: Verifica que el token de API sea válido');
      } else if (error.message.includes('project')) {
        throw new Error('Error de configuración en Sanity: Verifica el Project ID');
      }
    }
    
    throw error; // Re-lanzar el error para que se maneje en el componente
  }
};

export const getUserByFirebaseId = async (firebaseId: string): Promise<SanityUser | null> => {
  try {
    // Consulta específica sin usar ... para evitar campos no definidos en el esquema
    // hasCompletedCompanySetup se maneja en localStorage, no en Sanity
    const query = `*[_type == "user" && firebaseId == $firebaseId][0]{
      _id,
      _type,
      firebaseId,
      name,
      email,
      avatar,
      role,
      phone,
      typeDocument,
      documentNumber,
      company,
      "companyId": company._ref,
      locations,
      isActive,
      createdAt,
      updatedAt
    }`;
    const user = await sanityClient.fetch(query, { firebaseId });
    return user;
  } catch (error) {
    console.error('Error fetching user from Sanity:', error);
    throw new Error('Failed to fetch user from Sanity');
  }
};

export const updateUserLocations = async (firebaseId: string, locationIds: string[]) => {
  try {
    // Primero buscar el usuario por firebaseId
    const user = await getUserByFirebaseId(firebaseId);
    if (!user) {
      throw new Error('User not found in Sanity');
    }

    const locationRefs = locationIds.map(id => ({
      _key: crypto.randomUUID(), // Añadir una _key única para cada elemento del array
      _ref: id,
      _type: 'reference',
    }));

    // Actualizar usando el _id del documento de Sanity
    await sanityClient
      .patch(user._id)
      .set({ locations: locationRefs, updatedAt: new Date().toISOString() })
      .commit();
  } catch (error) {
    console.error('Error updating user locations:', error);
    throw new Error('Failed to update user locations');
  }
};

export const associateUserWithCompany = async (_firebaseId: string, companyId: string) => {
  // El parametro firebaseId es legacy: el API asocia siempre al user autenticado
  // (el JWT lleva el id). Lo mantenemos en la firma para no romper callers.
  void _firebaseId;
  return api.post<{ id: string; email: string; companyId: string }>(
    `/companies/${encodeURIComponent(companyId)}/associate-me`,
  );
};

export const markCompanySetupCompleted = async (_firebaseId: string) => {
  // No-op: el flag vive en localStorage (AuthContext.markSetupCompleted).
  // En el API basta con que el user tenga companyId; no hay flag separado.
  void _firebaseId;
  return { ok: true };
};

export const updateUserProfile = async (firebaseId: string, updateData: Partial<SanityUser>) => {
  try {
    const user = await getUserByFirebaseId(firebaseId);
    if (!user) {
      throw new Error('Usuario no encontrado en Sanity');
    }

    // Preparar los datos de actualización
    const updateFields = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Remover campos que no deben ser actualizados directamente
    delete updateFields._id;
    delete updateFields._type;
    delete updateFields.firebaseId;
    delete updateFields.createdAt;

    const result = await sanityClient
      .patch(user._id)
      .set(updateFields)
      .commit();

    console.log('Perfil de usuario actualizado exitosamente:', result._id);
    return result;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Error al actualizar el perfil del usuario');
  }
}; 