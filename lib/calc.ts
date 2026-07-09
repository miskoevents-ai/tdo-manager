// Reglas de negocio de cálculo (spec §5.2).
// Importes siempre positivos; la retención (-15% a empresas) resta al total.
// Cada línea puede ir por 'factura' (con IVA/retención) o por 'efectivo'
// (sin impuestos, contabilidad de amigos) — presupuestos mixtos.

export type LineaCalc = { cantidad: number; precio_unitario: number; via?: string | null };

export type Totales = {
  base: number; // suma de todas las líneas, sin impuestos
  iva: number; // solo sobre la parte facturable
  retencion: number; // solo sobre la parte facturable
  total: number; // parte facturable con impuestos + parte en efectivo
  baseFactura: number; // base de las líneas con vía factura
  efectivo: number; // suma de las líneas con vía efectivo (sin IVA)
  totalFactura: number; // lo que iría en la factura (base + IVA − retención)
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
  const importe = (l: LineaCalc) => (l.cantidad || 0) * (l.precio_unitario || 0);
  const baseFactura = redondea(
    lineas.filter((l) => l.via !== "efectivo").reduce((s, l) => s + importe(l), 0),
  );
  const efectivo = redondea(
    lineas.filter((l) => l.via === "efectivo").reduce((s, l) => s + importe(l), 0),
  );
  const iva = redondea((baseFactura * ivaPct) / 100);
  const retencion = redondea((baseFactura * retPct) / 100);
  const totalFactura = redondea(baseFactura + iva - retencion);
  return {
    base: redondea(baseFactura + efectivo),
    iva,
    retencion,
    total: redondea(totalFactura + efectivo),
    baseFactura,
    efectivo,
    totalFactura,
  };
}

/** Retención por defecto según el tipo de cliente (empresa → 15%). */
export function retencionPorTipo(tipoCliente: string | null | undefined): number {
  return tipoCliente === "empresa" ? 15 : 0;
}
