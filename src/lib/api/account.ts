// Ajustes de la propia cuenta, independientes de la empresa.
//
// Existen aparte de AuthContext porque no tocan la sesion: cambiar la
// contraseña no reautentica ni recarga el perfil.
import { api } from './client';

/**
 * Cambia la contraseña con la sesion abierta.
 *
 * El API exige la actual aunque ya haya sesion, asi que el formulario debe
 * pedirla siempre; el error de "no coincide" viene de alli, no de aqui.
 */
export const cambiarPassword = (currentPassword: string, newPassword: string) =>
  api.post<void>('/auth/change-password', { currentPassword, newPassword });
