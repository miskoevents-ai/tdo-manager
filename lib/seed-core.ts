// Lógica de seed reutilizable: carga docs/seed-data.json en Supabase.
// La usan tanto la ruta /api/seed (con ctx.supabaseAdmin de @supabase/server)
// como el script CLI. Recibe un cliente supabase-js con permisos de secret key.
import type { SupabaseClient } from "@supabase/supabase-js";

const ZERO = "00000000-0000-0000-0000-000000000000";
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const TIPO_EVENTO = new Set([
  "boda", "comunion", "corporativo", "cumpleanos", "bautizo", "navidad", "alquiler_encargo", "otro",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type SeedData = {
  clientes: Any[];
  lugares: Any[];
  equipo: Any[];
  inventario: Any[];
  gastos_fijos: Any[];
  oportunidades: Any[];
  tesoreria: Any[];
};

export async function runSeed(
  sb: SupabaseClient,
  data: SeedData,
): Promise<Record<string, number>> {
  const wipe = async (table: string) => {
    const { error } = await sb.from(table).delete().neq("id", ZERO);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  };
  const insert = async (table: string, rows: Any[]) => {
    if (!rows.length) return [] as Any[];
    const { data: out, error } = await sb.from(table).insert(rows).select();
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    return out ?? [];
  };

  for (const t of [
    "tesoreria", "facturas", "presupuesto_lineas", "oportunidades",
    "equipo", "inventario", "gastos_fijos", "clientes", "lugares",
  ]) {
    await wipe(t);
  }

  const lugares = await insert(
    "lugares",
    data.lugares.map((l) => ({ nombre: l.nombre, localidad: l.localidad ?? null })),
  );
  const lugarId: Record<string, string> = Object.fromEntries(lugares.map((l) => [l.nombre, l.id]));

  const clientes = await insert(
    "clientes",
    data.clientes.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo ?? "sin_clasificar",
      nif_cif: c.nif_cif ?? null,
      localidad: c.localidad ?? null,
      origen: c.origen ?? "cliente_nuevo",
      estado: c.estado === "cliente" ? "cliente" : "lead",
      notas: c.notas ?? null,
    })),
  );
  const clienteId: Record<string, string> = Object.fromEntries(clientes.map((c) => [c.nombre, c.id]));

  const equipo = await insert(
    "equipo",
    data.equipo.map((e) => ({
      nombre: e.nombre,
      rol: e.rol ?? null,
      porcentaje: e.porcentaje ?? null,
      precio_hora: e.precio_hora ?? null,
      activo: e.activo ?? true,
      notas: e.notas ?? null,
    })),
  );

  const inventario = await insert(
    "inventario",
    data.inventario.map((i) => ({
      articulo: i.articulo,
      categoria: i.categoria ?? null,
      cantidad_total: i.cantidad_total ?? null,
      precio_alquiler: i.precio_alquiler ?? null,
      fianza_sugerida: i.fianza_sugerida ?? null,
      notas: i.notas ?? null,
    })),
  );

  const gastos = await insert(
    "gastos_fijos",
    data.gastos_fijos.map((g) => ({
      concepto: g.concepto,
      importe_mensual: g.importe_mensual ?? 0,
      periodicidad: g.periodicidad ?? "mensual",
      quien_lo_paga: g.quien_lo_paga ?? null,
      activo: g.activo ?? true,
      notas: g.notas ?? null,
    })),
  );

  // Oportunidades + meta para líneas/facturas
  const opRows: Any[] = [];
  const opMeta: Record<string, Any> = {};
  for (const o of data.oportunidades) {
    const tieneBase = typeof o.base_imponible === "number";
    let ivaPct = 0;
    let retPct = 0;
    if (tieneBase) {
      ivaPct = typeof o.iva_pct === "number" ? o.iva_pct : 21;
      if (o.base_imponible > 0 && typeof o.retencion === "number" && o.retencion !== 0) {
        retPct = Math.round((Math.abs(o.retencion) / o.base_imponible) * 100);
      }
    }
    const lineas = Array.isArray(o.lineas) && o.lineas.length
      ? o.lineas.map((l: Any, idx: number) => ({
          concepto: l.concepto,
          cantidad: l.cantidad ?? 1,
          precio_unitario: l.precio_unitario ?? 0,
          orden: idx,
        }))
      : [{
          concepto: o.titulo,
          cantidad: 1,
          precio_unitario: tieneBase ? o.base_imponible : (o.total ?? 0),
          orden: 0,
        }];
    const cliId = o.cliente ? clienteId[o.cliente] ?? null : null;
    const lugId = o.lugar ? lugarId[o.lugar] ?? null : null;
    const base = r2(lineas.reduce((s: number, l: Any) => s + l.cantidad * l.precio_unitario, 0));
    const total = r2(base + (base * ivaPct) / 100 - (base * retPct) / 100);

    opRows.push({
      numero: o.numero,
      titulo: o.titulo,
      serie: o.serie ?? "evento",
      tipo_evento: TIPO_EVENTO.has(o.tipo_evento) ? o.tipo_evento : "otro",
      estado: o.estado ?? "nueva",
      presupuesto_enviado: Boolean(o.presupuesto_enviado),
      fecha_evento: o.fecha_evento ?? null,
      responsable: o.responsable ?? null,
      n_invitados: o.n_invitados ?? null,
      iva_pct: ivaPct,
      retencion_pct: retPct,
      fianza: o.fianza ?? null,
      cliente_id: cliId,
      lugar_id: lugId,
      notas: o.notas ?? null,
    });
    opMeta[o.numero] = { ivaPct, retPct, lineas, base, total, cliId };
  }
  const ops = await insert("oportunidades", opRows);
  const opId: Record<string, string> = Object.fromEntries(ops.map((o) => [o.numero, o.id]));

  const lineaRows: Any[] = [];
  for (const [numero, m] of Object.entries(opMeta)) {
    for (const l of m.lineas) lineaRows.push({ ...l, oportunidad_id: opId[numero] });
  }
  const lineas = await insert("presupuesto_lineas", lineaRows);

  // Cobrado por número (desde tesorería del seed)
  const cobradoPorNumero: Record<string, number> = {};
  for (const t of data.tesoreria) {
    if (t.tipo === "ingreso" && t.estado === "cobrado" && t.evento) {
      cobradoPorNumero[t.evento] = r2((cobradoPorNumero[t.evento] ?? 0) + t.importe);
    }
  }

  const facturaRows: Any[] = [];
  for (const o of data.oportunidades) {
    if (!["confirmada", "en_produccion", "realizada", "facturada"].includes(o.estado)) continue;
    const m = opMeta[o.numero];
    const iva = r2((m.base * m.ivaPct) / 100);
    const ret = r2((m.base * m.retPct) / 100);
    const cobrado = cobradoPorNumero[o.numero] ?? 0;
    facturaRows.push({
      numero: o.numero,
      oportunidad_id: opId[o.numero],
      cliente_id: m.cliId,
      fecha_emision: o.fecha_evento ?? "2026-06-01",
      base_imponible: m.base,
      iva,
      retencion: ret,
      total: m.total,
      estado: cobrado >= m.total - 0.01 ? "cobrada" : "emitida",
    });
  }
  const facturas = await insert("facturas", facturaRows);

  const tesoRows = data.tesoreria.map((t) => ({
    concepto: t.concepto,
    tipo: t.tipo,
    naturaleza: t.naturaleza ?? "otro",
    categoria: t.categoria ?? null,
    importe: t.importe,
    fecha: t.fecha,
    estado: t.estado ?? "previsto",
    metodo: t.metodo ?? null,
    oportunidad_id: t.evento ? opId[t.evento] ?? null : null,
    computa_contabilidad: t.computa_contabilidad ?? true,
  }));
  const teso = await insert("tesoreria", tesoRows);

  return {
    lugares: lugares.length,
    clientes: clientes.length,
    equipo: equipo.length,
    inventario: inventario.length,
    gastos_fijos: gastos.length,
    oportunidades: ops.length,
    presupuesto_lineas: lineas.length,
    facturas: facturas.length,
    tesoreria: teso.length,
  };
}
