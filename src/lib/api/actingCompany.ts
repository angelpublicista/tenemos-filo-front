// Empresa sobre la que esta operando un ADMIN ("actuando como").
//
// Vive fuera de React a proposito: el cliente HTTP la necesita en cada
// request y no puede leer hooks. AuthContext es quien la escribe.
const STORAGE_KEY = 'filo:acting-company';
const ROLE_KEY = 'filo:acting-company-role';

/** Cabecera que el API interpreta (solo para ADMIN). */
export const ACTING_COMPANY_HEADER = 'X-Acting-Company';

export function getActingCompany(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Modo incognito con storage bloqueado: seguimos sin empresa activa.
    return null;
  }
}

export function setActingCompany(companyId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (companyId) window.localStorage.setItem(STORAGE_KEY, companyId);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin persistencia el selector sigue funcionando dentro de la sesion.
  }
}

/**
 * Rol del titular de la empresa activa, recordado entre cargas.
 *
 * Es una pista para el primer render, no la verdad: el dato bueno lo trae
 * /companies/me y lo sobreescribe. Sirve para que al entrar en una empresa
 * de revendedor el menu no parpadee enseñando el de anfitrion mientras la
 * peticion viaja. Nada de permisos cuelga de aqui — eso lo decide el API.
 */
export function getActingOwnerRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
}

export function setActingOwnerRole(rol: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (rol) window.localStorage.setItem(ROLE_KEY, rol);
    else window.localStorage.removeItem(ROLE_KEY);
  } catch {
    // Igual que arriba: sin persistencia solo se pierde la pista.
  }
}
