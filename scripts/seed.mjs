// ============================================================================
// TDO Manager — Seed de datos reales (docs/seed-data.json → Supabase)
// Uso:  npm run seed         (lee .env.local)
// Resuelve FKs por nombre (cliente, lugar, evento) e inserta en orden.
// Idempotente: limpia las tablas antes de insertar.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

if (!URL || !KEY || URL.includes("TU-PROYECTO")) {
  console.error(
    "\n✗ Faltan credenciales. Define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local\n",
  );
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const data = JSON.parse(readFileSync(join(__dirname, "..", "docs", "seed-data.json"), "utf8"));

const ZERO = "00000000-0000-0000-0000-000000000000";
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

async function wipe(table) {
  const { error } = await sb.from(table).delete().neq("id", ZERO);
  if (error) throw new Error(`wipe ${table}: ${error.message}`);
}

async function insert(table, rows) {
  if (!rows.length) return [];
  const { data: out, error } = await sb.from(table).insert(rows).select();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return out;
}

// --- Mapeos de valores del seed a los enums del esquema ---
const TIPO_EVENTO = new Set([
  "boda", "comunion", "corporativo", "cumpleanos", "bautizo", "navidad", "alquiler_encargo", "otro",
]);
const clienteEstado = (c) => (c.estado === "cliente" ? "cliente" : "lead");

async function main() {
  console.log("→ Limpiando tablas…");
  for (const t of [
    "tesoreria", "facturas", "presupuesto_lineas", "oportunidades",
    "equipo", "inventario", "gastos_fijos", "clientes", "lugares",
  ]) {
    await wipe(t);
  }

  // --- Lugares ---
  const lugares = await insert(
    "lugares",
    data.lugares.map((l) => ({ nombre: l.nombre, localidad: l.localidad ?? null })),
  );
  const lugarId = Object.fromEntries(lugares.map((l) => [l.nombre, l.id]));
  console.log(`✓ lugares: ${lugares.length}`);

  // --- Clientes ---
  const clientes = await insert(
    "clientes",
    data.clientes.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo ?? "sin_clasificar",
      nif_cif: c.nif_cif ?? null,
      localidad: c.localidad ?? null,
      origen: c.origen ?? "cliente_nuevo",
      estado: clienteEstado(c),
      notas: c.notas ?? null,
    })),
  );
  const clienteId = Object.fromEntries(clientes.map((c) => [c.nombre, c.id]));
  console.log(`✓ clientes: ${clientes.length}`);

  // --- Equipo ---
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
  console.log(`✓ equipo: ${equipo.length}`);

  // --- Inventario ---
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
  console.log(`✓ inventario: ${inventario.length}`);

  // --- Gastos fijos ---
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
  console.log(`✓ gastos_fijos: ${gastos.length}`);

  // --- Oportunidades + líneas ---
  const opRows = [];
  const opMeta = {}; // numero -> { ivaPct, retPct, lineas, base, total, tipoOperacion }
  for (const o of data.oportunidades) {
    const tipoEvento = TIPO_EVENTO.has(o.tipo_evento) ? o.tipo_evento : "otro";
    const tieneBase = typeof o.base_imponible === "number";
    let ivaPct = 0;
    let retPct = 0;
    if (tieneBase) {
      ivaPct = typeof o.iva_pct === "number" ? o.iva_pct : 21;
      if (o.base_imponible > 0 && typeof o.retencion === "number" && o.retencion !== 0) {
        retPct = Math.round((Math.abs(o.retencion) / o.base_imponible) * 100);
      }
    }
    // Líneas: usar las del seed; si no hay, sintetizar una a partir de base/total.
    let lineas = Array.isArray(o.lineas) && o.lineas.length
      ? o.lineas.map((l, idx) => ({
          concepto: l.concepto,
          cantidad: l.cantidad ?? 1,
          precio_unitario: l.precio_unitario ?? 0,
          orden: idx,
        }))
      : [
          {
            concepto: o.titulo,
            cantidad: 1,
            precio_unitario: tieneBase ? o.base_imponible : (o.total ?? 0),
            orden: 0,
          },
        ];
    const cliId = o.cliente ? clienteId[o.cliente] ?? null : null;
    const lugId = o.lugar ? lugarId[o.lugar] ?? null : null;
    const base = r2(lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0));
    const total = r2(base + (base * ivaPct) / 100 - (base * retPct) / 100);

    opRows.push({
      numero: o.numero,
      titulo: o.titulo,
      serie: o.serie ?? "evento",
      tipo_evento: tipoEvento,
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
  const opId = Object.fromEntries(ops.map((o) => [o.numero, o.id]));
  console.log(`✓ oportunidades: ${ops.length}`);

  // Líneas de presupuesto
  const lineaRows = [];
  for (const [numero, m] of Object.entries(opMeta)) {
    for (const l of m.lineas) lineaRows.push({ ...l, oportunidad_id: opId[numero] });
  }
  const lineas = await insert("presupuesto_lineas", lineaRows);
  console.log(`✓ presupuesto_lineas: ${lineas.length}`);

  // --- Cobrado por oportunidad (desde tesorería del seed) ---
  const cobradoPorNumero = {};
  for (const t of data.tesoreria) {
    if (t.tipo === "ingreso" && t.estado === "cobrado" && t.evento) {
      cobradoPorNumero[t.evento] = r2((cobradoPorNumero[t.evento] ?? 0) + t.importe);
    }
  }

  // --- Facturas (generadas para oportunidades contratadas) ---
  const facturaRows = [];
  for (const o of data.oportunidades) {
    if (!["confirmada", "realizada", "facturada"].includes(o.estado)) continue;
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
  console.log(`✓ facturas: ${facturas.length}`);

  // --- Tesorería ---
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
  console.log(`✓ tesoreria: ${teso.length}`);

  console.log("\n✅ Seed completado.\n");
}

main().catch((e) => {
  console.error("\n✗ Error en el seed:", e.message, "\n");
  process.exit(1);
});
