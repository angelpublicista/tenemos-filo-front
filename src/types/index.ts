// Tipos para formularios de registro
export interface RegisterFormData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  terms: boolean;
}

export interface RegisterHostFormData extends RegisterFormData {
  phone: string;
}

// Tipos para formularios de login
export interface LoginFormData {
  email: string;
  password: string;
}

// Tipos para Sanity
export interface CreateUserData {
  firebaseId: string;
  name: string;
  email: string;
  role: 'guest' | 'host' | 'admin';
  phone: string;
}

export interface SanityUser {
  _id: string;
  _type: 'user';
  firebaseId: string;
  name: string;
  email: string;
  avatar?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  role: 'guest' | 'host' | 'admin';
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para autenticación
import { User } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  sanityUser: SanityUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: Omit<CreateUserData, 'firebaseId'>) => Promise<{ user: { uid: string } }>;
  resetPassword: (email: string) => Promise<void>;
}

// Tipos para componentes
export interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Tipos para Company
export interface Company {
  _id: string;
  _type: 'company';
  name: string;
  slug: {
    current: string;
    _type: 'slug';
  };
  description?: string;
  logo?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  locations?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  contactInfo: {
    email: string;
    phone: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para Location
export interface Location {
  _id: string;
  _type: 'location';
  name: string;
  slug: {
    current: string;
    _type: 'slug';
  };
  company: {
    _ref: string;
    _type: 'reference';
  };
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para formularios de registro por pasos
export interface HostStep1Data {
  fname: string;
  lname: string;
  phone: string;
  email: string;
  password: string;
  terms: boolean;
}

export interface HostStep2Data {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
}

export interface HostStep3Data {
  locationName: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  locationPhone?: string;
  locationEmail?: string;
  minGuests?: number;
  maxGuests?: number;
}

// Tipos para eventos (futuro)
export interface Event {
  _id: string;
  _type: 'event';
  title: string;
  description: string;
  hostId: string;
  date: string;
  location: string;
  maxGuests: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para reservas (futuro)
export interface Reservation {
  _id: string;
  _type: 'reservation';
  eventId: string;
  guestId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
} 