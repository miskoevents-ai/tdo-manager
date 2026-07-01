import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Cliente,
  Factura,
  Oportunidad,
  Lugar,
  Tesoreria,
} from "@/lib/types";

// Capa de acceso a datos (server-only). Usa la secret key vía admin client.

export async function getClientes(): Promise<Cliente[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Cliente) ?? null;
}

export async function getLugares(): Promise<Lugar[]> {
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
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tesoreria")
    .select("*")
    .eq("oportunidad_id", oportunidadId)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Tesoreria[];
}

export async function getFacturas(): Promise<Factura[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("facturas")
    .select("*, cliente:clientes(*)")
    .order("fecha_emision", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Factura[];
}
