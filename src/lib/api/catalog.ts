// Catalogo digital publico: lo que ve un cliente al abrir el enlace que le
// comparte un anfitrion. No requiere sesion.
import { api } from './client';
import { toCompany, type ApiCompany } from '@/lib/sanity/companyService';
import { toExperience, type ApiExperience } from '@/lib/sanity/experienceService';
import type { Company, Experience } from '@/types';

type RespuestaCatalogo = {
  company: ApiCompany;
  experiences: ApiExperience[];
  paymentsEnabled?: boolean;
};

/**
 * Acepta el slug de la empresa ("filo-demo") o su id.
 *
 * El id se sigue admitiendo porque los anfitriones ya compartieron enlaces
 * con ese formato y romperlos seria peor que tener dos formas validas.
 */
export const getPublicCatalog = async (
  slugOrId: string,
): Promise<{ company: Company; experiences: Experience[]; paymentsEnabled: boolean }> => {
  const data = await api.get<RespuestaCatalogo>(
    `/public/catalog/${encodeURIComponent(slugOrId)}`,
  );
  return {
    company: toCompany(data.company),
    experiences: (data.experiences ?? []).map(toExperience),
    paymentsEnabled: Boolean(data.paymentsEnabled),
  };
};
