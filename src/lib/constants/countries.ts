/**
 * Códigos de países en formato ISO 3166-1 alpha-2
 * Para futuras integraciones con APIs internacionales
 */

export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'CU', name: 'Cuba' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

export const COUNTRIES_MAP: Record<string, string> = COUNTRIES.reduce(
  (acc, country) => {
    acc[country.code] = country.name;
    return acc;
  },
  {} as Record<string, string>
);

export const getCountryName = (code?: string): string => {
  if (!code) return '';
  return COUNTRIES_MAP[code] || code;
};

