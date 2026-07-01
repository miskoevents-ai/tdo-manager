"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularTotales } from "@/lib/calc";

// ---------------------------- Clientes ----------------------------

export async function guardarCliente(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    nombre: (formData.get("nombre") as string)?.trim(),
    tipo: formData.get("tipo") as string,
    email: (formData.get("email") as string)?.trim() || null,
    telefono: (formData.get("telefono") as string)?.trim() || null,
    nif_cif: (formData.get("nif_cif") as string)?.trim() || null,
    localidad: (formData.get("localidad") as string)?.trim() || null,
    direccion: (formData.get("direccion") as string)?.trim() || null,
    origen: formData.get("origen") as string,
    estado: formData.get("estado") as string,
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.nombre) throw new Error("El nombre es obligatorio.");

  if (id) {
    const { error } = await sb.from("clientes").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("clientes").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/clientes");
}

// -------------------------- Oportunidades --------------------------

export async function guardarOportunidad(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const numToNull = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? Number(s) : null;
  };
  const payload = {
    numero: (formData.get("numero") as string)?.trim(),
    titulo: (formData.get("titulo") as string)?.trim(),
    serie: formData.get("serie") as string,
    tipo_evento: formData.get("tipo_evento") as string,
    tipo_operacion: formData.get("tipo_operacion") as string,
    estado: formData.get("estado") as string,
    cliente_id: (formData.get("cliente_id") as string) || null,
    lugar_id: (formData.get("lugar_id") as string) || null,
    fecha_evento: (formData.get("fecha_evento") as string) || null,
    responsable: (formData.get("responsable") as string)?.trim() || null,
    n_invitados: numToNull(formData.get("n_invitados")),
    iva_pct: numToNull(formData.get("iva_pct")) ?? 21,
    retencion_pct: numToNull(formData.get("retencion_pct")) ?? 0,
    fianza: numToNull(formData.get("fianza")),
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.numero || !payload.titulo) throw new Error("Número y título son obligatorios.");

  let opId = id;
  if (id) {
    const { error } = await sb.from("oportunidades").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await sb.from("oportunidades").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    opId = data.id;
  }
  revalidatePath("/oportunidades");
  if (opId) revalidatePath(`/oportunidades/${opId}`);
  return opId;
}

export async function cambiarEstado(id: string, estado: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("oportunidades").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/");
}

export async function toggleFianzaDevuelta(id: string, devuelta: boolean) {
  const sb = createAdminClient();
  const { error } = await sb.from("oportunidades").update({ fianza_devuelta: devuelta }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/");
}

type LineaInput = { concepto: string; cantidad: number; precio_unitario: number };

// Reemplaza todas las líneas de la oportunidad (borrar + insertar) y guarda IVA/retención.
export async function guardarLineas(
  oportunidadId: string,
  lineas: LineaInput[],
  ivaPct?: number,
  retPct?: number,
) {
  const sb = createAdminClient();

  if (typeof ivaPct === "number" || typeof retPct === "number") {
    const patch: Record<string, number> = {};
    if (typeof ivaPct === "number") patch.iva_pct = ivaPct;
    if (typeof retPct === "number") patch.retencion_pct = retPct;
    const { error } = await sb.from("oportunidades").update(patch).eq("id", oportunidadId);
    if (error) throw new Error(error.message);
  }

  const { error: delErr } = await sb
    .from("presupuesto_lineas")
    .delete()
    .eq("oportunidad_id", oportunidadId);
  if (delErr) throw new Error(delErr.message);

  const limpias = lineas.filter((l) => l.concepto.trim() !== "");
  if (limpias.length) {
    const rows = limpias.map((l, i) => ({
      oportunidad_id: oportunidadId,
      concepto: l.concepto.trim(),
      cantidad: l.cantidad || 0,
      precio_unitario: l.precio_unitario || 0,
      orden: i,
    }));
    const { error } = await sb.from("presupuesto_lineas").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/oportunidades");
  revalidatePath("/");
}

// --------------------------- Facturas ---------------------------

// Emite una factura a partir de una oportunidad (congela los importes).
export async function emitirFactura(oportunidadId: string) {
  const sb = createAdminClient();
  const { data: op, error } = await sb
    .from("oportunidades")
    .select("*, presupuesto_lineas(*)")
    .eq("id", oportunidadId)
    .single();
  if (error) throw new Error(error.message);

  const t = calcularTotales(
    (op.presupuesto_lineas ?? []).map((l: LineaInput) => ({
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    })),
    op.iva_pct,
    op.retencion_pct,
  );

  const { error: insErr } = await sb.from("facturas").insert({
    numero: op.numero,
    oportunidad_id: op.id,
    cliente_id: op.cliente_id,
    base_imponible: t.base,
    iva: t.iva,
    retencion: t.retencion,
    total: t.total,
    estado: "emitida",
  });
  if (insErr) throw new Error(insErr.message);

  await sb.from("oportunidades").update({ estado: "facturada" }).eq("id", op.id);
  revalidatePath("/facturas");
  revalidatePath(`/oportunidades/${op.id}`);
  revalidatePath("/oportunidades");
}

export async function marcarFacturaCobrada(id: string, cobrada: boolean) {
  const sb = createAdminClient();
  const { error } = await sb
    .from("facturas")
    .update({ estado: cobrada ? "cobrada" : "emitida" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/facturas");
  revalidatePath("/");
}
