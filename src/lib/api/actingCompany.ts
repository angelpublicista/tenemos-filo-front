// Empresa sobre la que esta operando un ADMIN ("actuando como").
//
// Vive fuera de React a proposito: el cliente HTTP la necesita en cada
// request y no puede leer hooks. AuthContext es quien la escribe.
const STORAGE_KEY = 'filo:acting-company';

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
