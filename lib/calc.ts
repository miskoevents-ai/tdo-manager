// Reglas de negocio de cálculo (spec §5.2).
// Importes siempre positivos; la retención (-15% a empresas) resta al total.
// Cada línea puede ir por 'factura' (con IVA/retención) o por 'efectivo'
// (sin impuestos, contabilidad de amigos) — presupuestos mixtos.
// Descuentos: cada línea puede llevar su % y además hay un % global que se
// aplica a todo el presupuesto (sobre la base, antes de IVA).

export type LineaCalc = {
  cantidad: number;
  precio_unitario: number;
  via?: string | null;
  descuento_pct?: number | null;
};

export type Totales = {
  base: number; // suma de todas las líneas, con descuentos aplicados
  iva: number; // solo sobre la parte facturable
  retencion: number; // solo sobre la parte facturable
  total: number; // parte facturable con impuestos + parte en efectivo
  baseFactura: number; // base de las líneas con vía factura (tras descuentos)
  efectivo: number; // suma de las líneas con vía efectivo (tras descuentos)
  totalFactura: number; // lo que iría en la factura (base + IVA − retención)
  bruto: number; // suma de las líneas con su descuento de línea, ANTES del global
  descuento: number; // importe que quita el descuento global
};

function redondea(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Importe de una línea con su descuento de línea aplicado. */
export function importeLinea(l: LineaCalc): number {
  const d = Math.min(100, Math.max(0, l.descuento_pct ?? 0));
  return (l.cantidad || 0) * (l.precio_unitario || 0) * (1 - d / 100);
}

/**
 * Calcula base, IVA y retención a partir de las líneas.
 * @param ivaPct        Porcentaje de IVA (por defecto 21).
 * @param retPct        Porcentaje de retención IRPF (0 o 15; solo empresas).
 * @param descuentoPct  Descuento global sobre toda la base (0–100).
 */
export function calcularTotales(
  lineas: LineaCalc[],
  ivaPct = 21,
  retPct = 0,
  descuentoPct: number | null = 0,
): Totales {
  const brutoFactura = redondea(
    lineas.filter((l) => l.via !== "efectivo").reduce((s, l) => s + importeLinea(l), 0),
  );
  const brutoEfectivo = redondea(
    lineas.filter((l) => l.via === "efectivo").reduce((s, l) => s + importeLinea(l), 0),
  );
  const f = 1 - Math.min(100, Math.max(0, descuentoPct ?? 0)) / 100;
  const baseFactura = redondea(brutoFactura * f);
  const efectivo = redondea(brutoEfectivo * f);
  const bruto = redondea(brutoFactura + brutoEfectivo);
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
    bruto,
    descuento: redondea(bruto - baseFactura - efectivo),
  };
}

/** Retención por defecto según el tipo de cliente (empresa → 15%). */
export function retencionPorTipo(tipoCliente: string | null | undefined): number {
  return tipoCliente === "empresa" ? 15 : 0;
}

// --- Modalidades (opciones excluyentes dentro de un mismo presupuesto) ---
// Una línea con `modalidad` vacía es COMÚN (va en todas las opciones); con
// texto, solo cuenta en esa opción. El cliente elige UNA, así que las opciones
// NO se suman: el total de cada opción = comunes + sus propias líneas.

export type LineaModalidad = LineaCalc & { modalidad?: string | null; concepto?: string };

export type OpcionResumen = { nombre: string; total: number; base: number };
export type ResumenModalidades = {
  hay: boolean; // ¿hay al menos una modalidad con nombre?
  opciones: OpcionResumen[]; // una por modalidad, en orden de aparición
  comunTotal: number; // total (con impuestos) solo de las líneas comunes
  min: number; // opción más barata (o total plano si no hay modalidades)
  max: number; // opción más cara
};

/** Nombre de modalidad normalizado (trim); "" y null cuentan como común. */
function modNombre(l: LineaModalidad): string | null {
  const m = (l.modalidad ?? "").trim();
  return m === "" ? null : m;
}

/**
 * Resume un presupuesto que puede tener modalidades. Si ninguna línea lleva
 * modalidad, `hay` es false y `opciones` va vacío (se usa el total normal).
 */
export function resumenModalidades(
  lineas: LineaModalidad[],
  ivaPct = 21,
  retPct = 0,
  descuentoPct: number | null = 0,
): ResumenModalidades {
  const comunes = lineas.filter((l) => modNombre(l) === null);
  const nombres: string[] = [];
  for (const l of lineas) {
    const m = modNombre(l);
    if (m && !nombres.includes(m)) nombres.push(m);
  }
  const comunTotal = calcularTotales(comunes, ivaPct, retPct, descuentoPct).total;
  if (nombres.length === 0) {
    const t = calcularTotales(lineas, ivaPct, retPct, descuentoPct).total;
    return { hay: false, opciones: [], comunTotal, min: t, max: t };
  }
  const opciones: OpcionResumen[] = nombres.map((nombre) => {
    const suyas = lineas.filter((l) => modNombre(l) === nombre);
    const t = calcularTotales([...comunes, ...suyas], ivaPct, retPct, descuentoPct);
    return { nombre, total: t.total, base: t.base };
  });
  const totales = opciones.map((o) => o.total);
  return {
    hay: true,
    opciones,
    comunTotal,
    min: Math.min(...totales),
    max: Math.max(...totales),
  };
}
