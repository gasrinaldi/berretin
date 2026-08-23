// Provincias reales de Argentina (dato geográfico público, no inventado)
// — lista fija usada para validar la asignación de región por palabra
// desde /admin/regiones. Nunca se infiere una región a partir de texto
// libre (por ejemplo, el campo "location" de los aportes comunitarios).
export const ARGENTINE_REGIONS = [
  "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

export type ArgentineRegion = (typeof ARGENTINE_REGIONS)[number];

export function isArgentineRegion(value: string): value is ArgentineRegion {
  return (ARGENTINE_REGIONS as readonly string[]).includes(value);
}
