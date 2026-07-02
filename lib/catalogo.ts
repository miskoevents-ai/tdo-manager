import { CATALOGO, type CatalogoItem } from "./catalogo-data";

export { CATALOGO };
export type { CatalogoItem };

// Fotos del catálogo en Supabase Storage. La base se deriva de la URL del
// proyecto (NEXT_PUBLIC_SUPABASE_URL). El bucket real se llama "Catalogo
// fotos 1" (se puede cambiar con NEXT_PUBLIC_CATALOGO_BUCKET sin tocar código).
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const BUCKET = process.env.NEXT_PUBLIC_CATALOGO_BUCKET || "Catalogo fotos 1";

export function fotoUrl(archivo: string): string {
  if (!BASE) return "";
  return `${BASE}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent(archivo)}`;
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
