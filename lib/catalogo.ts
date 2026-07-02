import { CATALOGO, type CatalogoItem } from "./catalogo-data";

export { CATALOGO };
export type { CatalogoItem };

// Base pública del bucket "catalogo" de Supabase Storage. Se deriva de la URL
// del proyecto (NEXT_PUBLIC_SUPABASE_URL), así que no hay nada que configurar
// aparte de subir las fotos al bucket público "catalogo".
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function fotoUrl(archivo: string): string {
  if (!BASE) return "";
  return `${BASE}/storage/v1/object/public/catalogo/${encodeURIComponent(archivo)}`;
}

// Categorías del catálogo (orden y etiqueta). Con su recuento se pintan los
// filtros de la galería.
export const CATEGORIAS: { key: string; label: string }[] = [
  { key: "flores", label: "Flores" },
  { key: "iluminacion", label: "Iluminación" },
  { key: "corporativo", label: "Corporativo" },
  { key: "rincones-boda", label: "Rincones de boda" },
  { key: "centros-mesa", label: "Centros de mesa" },
  { key: "photocall", label: "Photocall" },
  { key: "navidad", label: "Navidad" },
  { key: "ramos", label: "Ramos" },
];

export const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.key, c.label]),
);
