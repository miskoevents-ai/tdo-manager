// Reglas de negocio de cálculo (spec §5.2).
// Importes siempre positivos; la retención (-15% a empresas) resta al total.

export type LineaCalc = { cantidad: number; precio_unitario: number };

export type Totales = {
  base: number;
  iva: number;
  retencion: number;
  total: number;
};

function redondea(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula base, IVA y retención a partir de las líneas.
 * @param ivaPct   Porcentaje de IVA (por defecto 21).
 * @param retPct   Porcentaje de retención IRPF (0 o 15; solo empresas).
 */
export function calcularTotales(
  lineas: LineaCalc[],
  ivaPct = 21,
  retPct = 0,
): Totales {
  const base = redondea(
    lineas.reduce((s, l) => s + (l.cantidad || 0) * (l.precio_unitario || 0), 0),
  );
  const iva = redondea((base * ivaPct) / 100);
  const retencion = redondea((base * retPct) / 100);
  const total = redondea(base + iva - retencion);
  return { base, iva, retencion, total };
}

/** Retención por defecto según el tipo de cliente (empresa → 15%). */
export function retencionPorTipo(tipoCliente: string | null | undefined): number {
  return tipoCliente === "empresa" ? 15 : 0;
}
