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
  GastoFijo,
  Equipo,
  Inventario,
  CosteEstimado,
  Reunion,
  Proveedor,
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
    gastos_fijos: any[];
    equipo: any[];
    inventario: any[];
    // Opcionales: enriquecen la demo con el flujo completo de un evento.
    proveedores?: any[];
    costes_estimados?: any[]; // keyed por `evento` (numero de la oportunidad)
    reuniones?: any[]; // keyed por `evento`
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
  gastosFijos: GastoFijo[];
  equipo: Equipo[];
  inventario: Inventario[];
  proveedores: Proveedor[];
  costesEstimados: CosteEstimado[];
  reuniones: Reunion[];
} | null = null;

function build() {
  if (cache) return cache;
  const data = load();

  const lugares: Lugar[] = data.lugares.map((l) => ({
    id: `lugar-${slug(l.nombre)}`,
    nombre: l.nombre,
    localidad: l.localidad ?? null,
    distancia_km: null,
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
    canal: null,
    notas: c.notas ?? null,
    recomendacion_pedida: false,
    nos_ha_recomendado: false,
    created_at: "2026-06-01T00:00:00Z",
  }));
  const cliByName = Object.fromEntries(clientes.map((c, i) => [data.clientes[i].nombre, c]));

  const cobradoPorNum: Record<string, number> = {};
  for (const t of data.tesoreria) {
    if (t.tipo === "ingreso" && t.estado === "cobrado" && t.evento) {
      cobradoPorNum[t.evento] = r2((cobradoPorNum[t.evento] ?? 0) + t.importe);
    }
  }

  const CANALES_DEMO = ["instagram", "whatsapp", "email", "recomendacion", "web_bodasnet"];
  const shiftDays = (iso: string, delta: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  };
  const oportunidades: Oportunidad[] = data.oportunidades.map((o, i) => {
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
      // Demo: un par de operaciones a amigos para ilustrar la sección.
      tipo_operacion: /sof[áa]|columpio/i.test(o.titulo ?? "") ? "amigos_prestamo" : "normal",
      estado: o.estado ?? "nueva",
      presupuesto_enviado: Boolean(o.presupuesto_enviado),
      // Valores sintéticos solo en modo demo para ilustrar canal y tiempo de cierre.
      fecha_entrada: o.fecha_evento ? shiftDays(o.fecha_evento, -45) : null,
      canal: CANALES_DEMO[i % CANALES_DEMO.length],
      fecha_confirmacion: o.fecha_evento ? shiftDays(o.fecha_evento, -30 - (i % 5) * 3) : null,
      fecha_evento: o.fecha_evento ?? null,
      fecha_montaje: null,
      fecha_recogida: null,
      responsable: o.responsable ?? null,
      n_invitados: o.n_invitados ?? null,
      iva_pct: ivaPct,
      retencion_pct: retPct,
      fianza: o.fianza ?? null,
      fianza_devuelta: false,
      fecha_devolucion_fianza: null,
      resena_pedida: false,
      resena_conseguida: false,
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
    .filter((o) => ["confirmada", "en_produccion", "realizada", "facturada"].includes(o.estado))
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
      cliente_id: op?.cliente_id ?? null,
      proveedor_id: null,
      quien_lo_paga: (t as { quien_lo_paga?: string }).quien_lo_paga ?? null,
      computa_contabilidad: t.computa_contabilidad ?? true,
      created_at: "2026-06-01T00:00:00Z",
      oportunidad: op ? { numero: op.numero, titulo: op.titulo } : null,
      cliente: op?.cliente ? { nombre: op.cliente.nombre } : null,
    } as Tesoreria;
  });

  const gastosFijos: GastoFijo[] = (data.gastos_fijos ?? []).map((g, i) => ({
    id: `gf-${i}`,
    concepto: g.concepto,
    importe_mensual: g.importe_mensual ?? 0,
    periodicidad: g.periodicidad ?? "mensual",
    quien_lo_paga: g.quien_lo_paga ?? null,
    activo: g.activo ?? true,
    notas: g.notas ?? null,
  }));

  const equipo: Equipo[] = (data.equipo ?? []).map((e, i) => ({
    id: `eq-${i}`,
    nombre: e.nombre,
    rol: e.rol ?? null,
    email: null,
    telefono: null,
    porcentaje: e.porcentaje ?? null,
    precio_hora: e.precio_hora ?? null,
    activo: e.activo ?? true,
    notas: e.notas ?? null,
  }));

  const inventario: Inventario[] = (data.inventario ?? []).map((it, i) => ({
    id: `inv-${i}`,
    articulo: it.articulo,
    categoria: it.categoria ?? null,
    cantidad_total: it.cantidad_total ?? null,
    coste_unitario: null,
    precio_alquiler: it.precio_alquiler ?? null,
    fianza_sugerida: it.fianza_sugerida ?? null,
    fianza_especial: Boolean(it.fianza_sugerida),
    ubicacion: null,
    estado: "disponible",
    foto_url: null,
    notas: it.notas ?? null,
  }));

  // Proveedores, costes previstos y reuniones (opcionales en el seed): dan vida
  // al flujo completo Costes → Calculadora → Presupuesto en la demo.
  const proveedores: Proveedor[] = (data.proveedores ?? []).map((p, i) => ({
    id: `prov-${i}`,
    nombre: p.nombre,
    tipo_servicio: p.tipo_servicio ?? null,
    contacto: null,
    email: null,
    telefono: null,
    localidad: p.localidad ?? null,
    notas: null,
    created_at: "2026-06-01T00:00:00Z",
  }));
  const provByName = Object.fromEntries(proveedores.map((p) => [p.nombre, p]));
  const opByNum = Object.fromEntries(oportunidades.map((o) => [o.numero, o]));
  const eqByName = Object.fromEntries(equipo.map((e) => [e.nombre, e]));

  const costesEstimados: CosteEstimado[] = (data.costes_estimados ?? [])
    .filter((c) => opByNum[c.evento])
    .map((c, i) => {
      const cantidad = c.cantidad ?? 1;
      const precio = c.precio_unitario ?? 0;
      return {
        id: `ce-${i}`,
        oportunidad_id: opByNum[c.evento].id,
        concepto: c.concepto ?? "",
        cantidad,
        precio_unitario: precio,
        importe: r2(cantidad * precio),
        categoria: c.categoria ?? "material",
        cuadrado: Boolean(c.cuadrado),
        equipo_id: c.persona ? (eqByName[c.persona]?.id ?? null) : null,
        persona_externa: c.persona && !eqByName[c.persona] ? c.persona : null,
        pagador: c.pagador ?? null,
        proveedor_id: c.proveedor ? (provByName[c.proveedor]?.id ?? null) : null,
        nota: c.nota ?? null,
        created_at: "2026-06-01T00:00:00Z",
      } as CosteEstimado;
    });

  const reuniones: Reunion[] = (data.reuniones ?? [])
    .filter((r) => opByNum[r.evento])
    .map((r, i) => ({
      id: `reu-${i}`,
      oportunidad_id: opByNum[r.evento].id,
      fecha: r.fecha,
      hora: r.hora ?? null,
      modalidad: r.modalidad === "online" ? "online" : "presencial",
      atendida_por: r.atendida_por ?? null,
      enlace: r.enlace ?? null,
      lugar: r.lugar ?? null,
      notas: r.notas ?? null,
      transcripcion: r.transcripcion ?? null,
      realizada: Boolean(r.realizada),
      created_at: "2026-06-01T00:00:00Z",
      oportunidad: { id: opByNum[r.evento].id, titulo: opByNum[r.evento].titulo },
    }));

  cache = { clientes, lugares, oportunidades, facturas, tesoreria, gastosFijos, equipo, inventario, proveedores, costesEstimados, reuniones };
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
  gastosFijos: () => build().gastosFijos,
  equipo: () => build().equipo,
  inventario: () => build().inventario,
  tesoreria: () => build().tesoreria,
  tesoreriaDe: (id: string) => build().tesoreria.filter((t) => t.oportunidad_id === id),
  oportunidad: (id: string) => build().oportunidades.find((o) => o.id === id) ?? null,
  cliente: (id: string) => build().clientes.find((c) => c.id === id) ?? null,
  proveedores: () => build().proveedores,
  costesEstimadosDe: (opId: string) => build().costesEstimados.filter((c) => c.oportunidad_id === opId),
  reunionesDe: (opId: string) => build().reuniones.filter((r) => r.oportunidad_id === opId),
  reuniones: () => build().reuniones,
};
