// Categorías de los gastos fijos y qué "segundo campo" pide cada una:
//  · persona  → beneficiario del equipo (sueldos) → enlaza con Equipo/Sueldos.
//  · proveedor→ a quién se le paga → enlaza con Proveedores (coste recurrente).
//  · null     → sin segundo campo.
export type CampoExtra = "persona" | "proveedor" | null;
export type CategoriaGasto = { key: string; label: string; emoji: string; campo: CampoExtra };

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  { key: "sueldo", label: "Sueldo", emoji: "👤", campo: "persona" },
  { key: "local", label: "Local / Alquiler", emoji: "🏠", campo: "proveedor" },
  { key: "suministros", label: "Suministros (luz, agua, gas, basuras)", emoji: "💡", campo: "proveedor" },
  { key: "telefonia", label: "Telefonía / Internet", emoji: "📶", campo: "proveedor" },
  { key: "tecnologia", label: "Tecnología / Software", emoji: "💻", campo: "proveedor" },
  { key: "servicios", label: "Servicios (gestoría, limpieza, mantenimiento)", emoji: "🧰", campo: "proveedor" },
  { key: "marketing", label: "Marketing / RRSS", emoji: "📣", campo: "proveedor" },
  { key: "seguros", label: "Seguros", emoji: "🛡️", campo: "proveedor" },
  { key: "impuestos", label: "Impuestos y tasas", emoji: "🧾", campo: null },
  { key: "financiero", label: "Financiero (cuotas, banco)", emoji: "🏦", campo: "proveedor" },
  { key: "otros", label: "Otros", emoji: "•", campo: null },
];

export const CATEGORIA_GASTO_MAP: Record<string, CategoriaGasto> = Object.fromEntries(
  CATEGORIAS_GASTO.map((c) => [c.key, c]),
);

export function campoDeCategoria(key: string | null | undefined): CampoExtra {
  return (key && CATEGORIA_GASTO_MAP[key]?.campo) || null;
}
