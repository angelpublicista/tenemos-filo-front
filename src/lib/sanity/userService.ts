import { sanityClient } from './sanityClient';
import { CreateUserData, SanityUser } from '@/types';

export const createUserInSanity = async (userData: CreateUserData) => {
  try {
    const doc = {
      _type: 'user',
      firebaseId: userData.firebaseId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone,
             isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating user in Sanity:', error);
    throw new Error('Failed to create user in Sanity');
  }
};

export const getUserByFirebaseId = async (firebaseId: string): Promise<SanityUser | null> => {
  try {
    const query = `*[_type == "user" && firebaseId == $firebaseId][0]`;
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