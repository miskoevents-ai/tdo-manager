// Modo demo/offline: construye los datos desde docs/seed-data.json sin Supabase.
// Se activa SOLO con TDO_MOCK=1 (útil para ver las pantallas sin conexión a la BD).
// No afecta a producción (por defecto está desactivado).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Cliente,
  Factura,
  Oportunidad,
  Lugar,
  PresupuestoLinea,
  Tesoreria,
} from "@/lib/types";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const slug = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

type Raw = ReturnType<typeof load>;

function load() {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "docs", "seed-data.json"), "utf8"),
  );
  return raw as {
    clientes: any[];
    lugares: any[];
    oportunidades: any[];
    tesoreria: any[];
  };
}

const TIPO_EVENTO = new Set([
  "boda", "comunion", "corporativo", "cumpleanos", "bautizo", "navidad", "alquiler_encargo", "otro",
]);

let cache: {
  clientes: Cliente[];
  lugares: Lugar[];
  oportunidades: Oportunidad[];
  facturas: Factura[];
  tesoreria: Tesoreria[];
} | null = null;

function build() {
  if (cache) return cache;
  const data = load();

  const lugares: Lugar[] = data.lugares.map((l) => ({
    id: `lugar-${slug(l.nombre)}`,
    nombre: l.nombre,
    localidad: l.localidad ?? null,
    notas: null,
  }));
  const lugarByName = Object.fromEntries(lugares.map((l, i) => [data.lugares[i].nombre, l]));

  const clientes: Cliente[] = data.clientes.map((c) => ({
    id: `cli-${slug(c.nombre)}`,
    nombre: c.nombre,
    tipo: c.tipo ?? "sin_clasificar",
    email: null,
    telefono: null,
    nif_cif: c.nif_cif ?? null,
    direccion: null,
    localidad: c.localidad ?? null,
    origen: c.origen ?? "cliente_nuevo",
    estado: c.estado === "cliente" ? "cliente" : "lead",
    notas: c.notas ?? null,
    created_at: "2026-06-01T00:00:00Z",
  }));
  const cliByName = Object.fromEntries(clientes.map((c, i) => [data.clientes[i].nombre, c]));

  const cobradoPorNum: Record<string, number> = {};
  for (const t of data.tesoreria) {
    if (t.tipo === "ingreso" && t.estado === "cobrado" && t.evento) {
      cobradoPorNum[t.evento] = r2((cobradoPorNum[t.evento] ?? 0) + t.importe);
    }
  }

  const oportunidades: Oportunidad[] = data.oportunidades.map((o) => {
    const tieneBase = typeof o.base_imponible === "number";
    let ivaPct = 0;
    let retPct = 0;
    if (tieneBase) {
      ivaPct = typeof o.iva_pct === "number" ? o.iva_pct : 21;
      if (o.base_imponible > 0 && typeof o.retencion === "number" && o.retencion !== 0) {
        retPct = Math.round((Math.abs(o.retencion) / o.base_imponible) * 100);
      }
    }
    const id = `op-${slug(o.numero)}`;
    const lineasSrc =
      Array.isArray(o.lineas) && o.lineas.length
        ? o.lineas.map((l: any, idx: number) => ({
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
    const presupuesto_lineas: PresupuestoLinea[] = lineasSrc.map((l: any, idx: number) => ({
      id: `${id}-l${idx}`,
      oportunidad_id: id,
      concepto: l.concepto,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      orden: l.orden,
    }));
    const cli = o.cliente ? cliByName[o.cliente] ?? null : null;
    const lug = o.lugar ? lugarByName[o.lugar] ?? null : null;

    return {
      id,
      numero: o.numero,
      titulo: o.titulo,
      serie: o.serie ?? "evento",
      tipo_evento: TIPO_EVENTO.has(o.tipo_evento) ? o.tipo_evento : "otro",
      tipo_operacion: "normal",
      estado: o.estado ?? "nueva",
      presupuesto_enviado: Boolean(o.presupuesto_enviado),
      fecha_evento: o.fecha_evento ?? null,
      fecha_montaje: null,
      fecha_recogida: null,
      responsable: o.responsable ?? null,
      n_invitados: o.n_invitados ?? null,
      iva_pct: ivaPct,
      retencion_pct: retPct,
      fianza: o.fianza ?? null,
      fianza_devuelta: false,
      cliente_id: cli?.id ?? null,
      lugar_id: lug?.id ?? null,
      notas: o.notas ?? null,
      created_at: "2026-06-01T00:00:00Z",
      cliente: cli,
      lugar: lug,
      presupuesto_lineas,
      cobrado: cobradoPorNum[o.numero] ?? 0,
    } as Oportunidad;
  });

  const facturas: Factura[] = data.oportunidades
    .filter((o) => ["confirmada", "realizada", "facturada"].includes(o.estado))
    .map((o) => {
      const op = oportunidades.find((x) => x.numero === o.numero)!;
      const base = r2(
        (op.presupuesto_lineas ?? []).reduce((s, l) => s + l.cantidad * l.precio_unitario, 0),
      );
      const iva = r2((base * op.iva_pct) / 100);
      const ret = r2((base * op.retencion_pct) / 100);
      const total = r2(base + iva - ret);
      const cobrado = cobradoPorNum[o.numero] ?? 0;
      return {
        id: `fac-${slug(o.numero)}`,
        numero: o.numero,
        oportunidad_id: op.id,
        cliente_id: op.cliente_id,
        fecha_emision: o.fecha_evento ?? "2026-06-01",
        base_imponible: base,
        iva,
        retencion: ret,
        total,
        estado: cobrado >= total - 0.01 ? "cobrada" : "emitida",
        notas: null,
        cliente: op.cliente ?? null,
      } as Factura;
    });

  const tesoreria: Tesoreria[] = data.tesoreria.map((t, i) => {
    const op = t.evento ? oportunidades.find((x) => x.numero === t.evento) : null;
    return {
      id: `teso-${i}`,
      concepto: t.concepto,
      tipo: t.tipo,
      naturaleza: t.naturaleza ?? "otro",
      categoria: t.categoria ?? null,
      importe: t.importe,
      fecha: t.fecha,
      estado: t.estado ?? "previsto",
      metodo: t.metodo ?? null,
      oportunidad_id: op?.id ?? null,
      computa_contabilidad: t.computa_contabilidad ?? true,
      created_at: "2026-06-01T00:00:00Z",
    } as Tesoreria;
  });

  cache = { clientes, lugares, oportunidades, facturas, tesoreria };
  return cache;
}

export const mock = {
  get enabled() {
    return process.env.TDO_MOCK === "1";
  },
  clientes: () => build().clientes,
  lugares: () => build().lugares,
  oportunidades: () => build().oportunidades,
  facturas: () => build().facturas,
  tesoreriaDe: (id: string) => build().tesoreria.filter((t) => t.oportunidad_id === id),
  oportunidad: (id: string) => build().oportunidades.find((o) => o.id === id) ?? null,
  cliente: (id: string) => build().clientes.find((c) => c.id === id) ?? null,
};
