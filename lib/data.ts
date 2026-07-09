import { createAdminClient } from "@/lib/supabase/admin";
import { mock } from "@/lib/mock";
import type {
  Cliente,
  Factura,
  Oportunidad,
  Lugar,
  Tesoreria,
  GastoFijo,
  Equipo,
  Proveedor,
  ComisionConfig,
  Comision,
  Inventario,
  Reserva,
  ParteHoras,
  Desplazamiento,
  Reunion,
  Tarea,
  PresupuestoVersion,
} from "@/lib/types";

// Capa de acceso a datos (server-only). Usa la secret key vía admin client.
// En modo demo (TDO_MOCK=1) lee docs/seed-data.json sin conectar a Supabase.

export async function getClientes(): Promise<Cliente[]> {
  if (mock.enabled) return mock.clientes();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  if (mock.enabled) return mock.cliente(id);
  const sb = createAdminClient();
  const { data, error } = await sb.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Cliente) ?? null;
}

export async function getLugares(): Promise<Lugar[]> {
  if (mock.enabled) return mock.lugares();
  const sb = createAdminClient();
  const { data, error } = await sb.from("lugares").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as Lugar[];
}

// Suma de cobros (ingresos cobrados) por oportunidad, desde tesorería.
async function cobradoPorOportunidad(): Promise<Record<string, number>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tesoreria")
    .select("oportunidad_id, importe, tipo, estado")
    .eq("tipo", "ingreso")
    .eq("estado", "cobrado");
  if (error) throw new Error(error.message);
  const map: Record<string, number> = {};
  for (const t of (data ?? []) as Tesoreria[]) {
    if (t.oportunidad_id) map[t.oportunidad_id] = (map[t.oportunidad_id] ?? 0) + Number(t.importe);
  }
  return map;
}

export async function getOportunidades(): Promise<Oportunidad[]> {
  if (mock.enabled) return mock.oportunidades();
  const sb = createAdminClient();
  const [{ data, error }, cobrado] = await Promise.all([
    sb
      .from("oportunidades")
      .select("*, cliente:clientes(*), lugar:lugares(*), presupuesto_lineas(*)")
      .order("fecha_evento", { ascending: true, nullsFirst: false }),
    cobradoPorOportunidad(),
  ]);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Oportunidad[]).map((o) => ({
    ...o,
    presupuesto_lineas: (o.presupuesto_lineas ?? []).sort((a, b) => a.orden - b.orden),
    cobrado: cobrado[o.id] ?? 0,
  }));
}

export async function getOportunidad(id: string): Promise<Oportunidad | null> {
  if (mock.enabled) return mock.oportunidad(id);
  const sb = createAdminClient();
  const [{ data, error }, cobrado] = await Promise.all([
    sb
      .from("oportunidades")
      .select("*, cliente:clientes(*), lugar:lugares(*), presupuesto_lineas(*)")
      .eq("id", id)
      .maybeSingle(),
    cobradoPorOportunidad(),
  ]);
  if (error) throw new Error(error.message);
  if (!data) return null;
  const o = data as Oportunidad;
  return {
    ...o,
    presupuesto_lineas: (o.presupuesto_lineas ?? []).sort((a, b) => a.orden - b.orden),
    cobrado: cobrado[o.id] ?? 0,
  };
}

export async function getTesoreriaDeOportunidad(oportunidadId: string): Promise<Tesoreria[]> {
  if (mock.enabled) return mock.tesoreriaDe(oportunidadId);
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tesoreria")
    .select("*")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Tesoreria[];
}

export async function getPartesHoras(oportunidadId: string): Promise<ParteHoras[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("partes_horas")
    .select("*, equipo:equipo(nombre)")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ParteHoras[];
}

export async function getDesplazamientos(oportunidadId: string): Promise<Desplazamiento[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("desplazamientos")
    .select("*")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Desplazamiento[];
}

// Si la tabla aún no existe (migración 010 sin ejecutar) devuelve vacío para
// no romper el calendario ni las fichas.
const tablaNoExiste = (e: { code?: string; message: string }) =>
  e.code === "42P01" || /does not exist/i.test(e.message);

export async function getReuniones(): Promise<Reunion[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("reuniones")
    .select("*, oportunidad:oportunidades(id, titulo)")
    .order("fecha", { ascending: true });
  if (error) {
    if (tablaNoExiste(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as Reunion[];
}

export async function getReunionesDeOportunidad(oportunidadId: string): Promise<Reunion[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("reuniones")
    .select("*")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha", { ascending: true });
  if (error) {
    if (tablaNoExiste(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as Reunion[];
}

export async function getTareas(): Promise<Tarea[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tareas")
    .select("*, oportunidad:oportunidades(id, titulo)")
    .order("created_at", { ascending: false });
  if (error) {
    if (tablaNoExiste(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as Tarea[];
}

export async function getKmPrecio(): Promise<number> {
  if (mock.enabled) return 0.26;
  const sb = createAdminClient();
  const { data } = await sb.from("ajustes").select("valor").eq("clave", "km_precio").maybeSingle();
  const v = data?.valor ? Number(data.valor) : NaN;
  return isFinite(v) ? v : 0.26;
}

// Mes de arranque de la contabilidad (YYYY-MM). Configurable en ajustes;
// por defecto mayo 2026 (primer movimiento real del traspaso).
export async function getContabilidadInicio(): Promise<string> {
  if (mock.enabled) return "2026-05";
  const sb = createAdminClient();
  const { data } = await sb
    .from("ajustes")
    .select("valor")
    .eq("clave", "contabilidad_inicio")
    .maybeSingle();
  const v = (data?.valor as string | undefined)?.trim();
  return v && /^\d{4}-\d{2}$/.test(v) ? v : "2026-05";
}

export async function getReservas(): Promise<Reserva[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("reservas_material")
    .select("*, articulo:inventario(articulo, cantidad_total), oportunidad:oportunidades(numero, titulo)")
    .order("fecha_salida", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Reserva[];
}

export async function getInventario(): Promise<Inventario[]> {
  if (mock.enabled) return mock.inventario();
  const sb = createAdminClient();
  const { data, error } = await sb.from("inventario").select("*").order("articulo");
  if (error) throw new Error(error.message);
  return (data ?? []) as Inventario[];
}

export async function getProveedores(): Promise<Proveedor[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb.from("proveedores").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as Proveedor[];
}

export async function getComisionesConfig(): Promise<ComisionConfig[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("comisiones_config")
    .select("*, equipo:equipo(nombre)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ComisionConfig[];
}

export async function getComisiones(): Promise<Comision[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb.from("comisiones").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as Comision[];
}

export async function getEquipo(): Promise<Equipo[]> {
  if (mock.enabled) return mock.equipo();
  const sb = createAdminClient();
  const { data, error } = await sb.from("equipo").select("*").order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Equipo[];
}

export async function getGastosFijos(): Promise<GastoFijo[]> {
  if (mock.enabled) return mock.gastosFijos();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("gastos_fijos")
    .select("*")
    .order("concepto", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as GastoFijo[];
}

export async function getTesoreria(): Promise<Tesoreria[]> {
  if (mock.enabled) return mock.tesoreria();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tesoreria")
    .select("*, oportunidad:oportunidades(numero, titulo), cliente:clientes(nombre)")
    .order("fecha", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Tesoreria[];
}

export async function getFacturas(): Promise<Factura[]> {
  if (mock.enabled) return mock.facturas();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("facturas")
    .select("*, cliente:clientes(*)")
    .order("fecha_emision", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Factura[];
}

// Factura con todo lo necesario para pintar el documento: cliente y, como
// respaldo si no tiene líneas congeladas, las líneas del presupuesto.
export async function getFactura(id: string): Promise<Factura | null> {
  if (mock.enabled) return mock.facturas().find((f) => f.id === id) ?? null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("facturas")
    .select(
      "*, cliente:clientes(*), oportunidad:oportunidades(id, numero, titulo, tipo_evento, fecha_evento, presupuesto_lineas(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Factura) ?? null;
}

// Versiones guardadas del presupuesto (V1, V2…). Si la tabla aún no existe
// (migración 019 sin ejecutar) devuelve vacío para no romper la ficha.
export async function getVersionesPresupuesto(
  oportunidadId: string,
): Promise<PresupuestoVersion[]> {
  if (mock.enabled) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("presupuesto_versiones")
    .select("*")
    .eq("oportunidad_id", oportunidadId)
    .order("version", { ascending: false });
  if (error) {
    if (tablaNoExiste(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as PresupuestoVersion[];
}

export async function getVersionPresupuesto(id: string): Promise<PresupuestoVersion | null> {
  if (mock.enabled) return null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("presupuesto_versiones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (tablaNoExiste(error)) return null;
    throw new Error(error.message);
  }
  return (data as PresupuestoVersion) ?? null;
}

export async function getFacturaDeOportunidad(
  oportunidadId: string,
): Promise<Pick<Factura, "id" | "numero" | "estado"> | null> {
  if (mock.enabled)
    return mock.facturas().find((f) => f.oportunidad_id === oportunidadId) ?? null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("facturas")
    .select("id, numero, estado")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha_emision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Pick<Factura, "id" | "numero" | "estado">) ?? null;
}
