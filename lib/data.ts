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

export async function getKmPrecio(): Promise<number> {
  if (mock.enabled) return 0.26;
  const sb = createAdminClient();
  const { data } = await sb.from("ajustes").select("valor").eq("clave", "km_precio").maybeSingle();
  const v = data?.valor ? Number(data.valor) : NaN;
  return isFinite(v) ? v : 0.26;
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
  const { data, error } = await sb.from("equipo").select("*").order("porcentaje", { ascending: false });
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
