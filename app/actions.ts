"use server";

import { revalidatePath } from "next/cache";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularTotales } from "@/lib/calc";
import { runSeed, type SeedData } from "@/lib/seed-core";

// ---------------------------- Seed (setup) ----------------------------
// Carga docs/seed-data.json en Supabase. Protegido por SEED_TOKEN.
// OJO: reemplaza (borra + inserta) los datos de las tablas de Fase 1.
export async function seedAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const token = (formData.get("token") as string)?.trim();
  // Usa SEED_TOKEN si está definido; si no, el valor por defecto de puesta en marcha.
  const expected = process.env.SEED_TOKEN?.trim() || "tdo-seed-2026";
  if (token !== expected) {
    return { ok: false, message: "Token incorrecto." };
  }
  try {
    const data = JSON.parse(
      readFileSync(join(process.cwd(), "docs", "seed-data.json"), "utf8"),
    ) as SeedData;
    const counts = await runSeed(createAdminClient(), data);
    const resumen = Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(" · ");
    revalidatePath("/");
    return { ok: true, message: `Datos cargados: ${resumen}.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

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
    canal: (formData.get("canal") as string) || null,
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

// Crea un cliente rápido (desde el formulario de oportunidad) y lo devuelve.
export async function crearClienteRapido(
  nombre: string,
  tipo: string,
): Promise<{ id: string; nombre: string }> {
  const sb = createAdminClient();
  const limpio = nombre.trim();
  if (!limpio) throw new Error("El nombre es obligatorio.");
  const { data, error } = await sb
    .from("clientes")
    .insert({ nombre: limpio, tipo, estado: "lead", origen: "cliente_nuevo" })
    .select("id, nombre")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  return data as { id: string; nombre: string };
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
    fecha_entrada: (formData.get("fecha_entrada") as string) || null,
    canal: (formData.get("canal") as string) || null,
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

// --------------------------- Tesorería ---------------------------

export async function guardarMovimiento(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const importe = Math.abs(Number(formData.get("importe") || 0));
  if (!importe || importe <= 0) throw new Error("El importe debe ser positivo y mayor que 0.");

  const payload = {
    concepto: (formData.get("concepto") as string)?.trim(),
    tipo: formData.get("tipo") as string, // ingreso | gasto (da el signo)
    naturaleza: formData.get("naturaleza") as string,
    categoria: (formData.get("categoria") as string)?.trim() || null,
    importe, // SIEMPRE positivo
    fecha: (formData.get("fecha") as string) || new Date().toISOString().slice(0, 10),
    estado: formData.get("estado") as string,
    metodo: (formData.get("metodo") as string) || null,
    oportunidad_id: (formData.get("oportunidad_id") as string) || null,
    cliente_id: (formData.get("cliente_id") as string) || null,
    proveedor_id: (formData.get("proveedor_id") as string) || null,
    computa_contabilidad: formData.get("computa_contabilidad") === "on",
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.concepto) throw new Error("El concepto es obligatorio.");

  if (id) {
    const { error } = await sb.from("tesoreria").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("tesoreria").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tesoreria");
  revalidatePath("/");
}

export async function borrarMovimiento(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("tesoreria").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tesoreria");
  revalidatePath("/");
}

// --------------------------- Proveedores ---------------------------

export async function guardarProveedor(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    nombre: (formData.get("nombre") as string)?.trim(),
    tipo_servicio: (formData.get("tipo_servicio") as string)?.trim() || null,
    contacto: (formData.get("contacto") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    telefono: (formData.get("telefono") as string)?.trim() || null,
    localidad: (formData.get("localidad") as string)?.trim() || null,
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.nombre) throw new Error("El nombre es obligatorio.");

  if (id) {
    const { error } = await sb.from("proveedores").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("proveedores").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/proveedores");
}

export async function borrarProveedor(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("proveedores").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/proveedores");
}

// --------------------------- Gastos fijos ---------------------------

export async function guardarGastoFijo(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    concepto: (formData.get("concepto") as string)?.trim(),
    importe_mensual: Math.abs(Number(formData.get("importe_mensual") || 0)),
    periodicidad: (formData.get("periodicidad") as string) || "mensual",
    quien_lo_paga: (formData.get("quien_lo_paga") as string)?.trim() || null,
    activo: formData.get("activo") === "on",
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.concepto) throw new Error("El concepto es obligatorio.");

  if (id) {
    const { error } = await sb.from("gastos_fijos").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("gastos_fijos").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/gastos-fijos");
}

export async function borrarGastoFijo(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("gastos_fijos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gastos-fijos");
}

// ¿Toca este gasto en el mes indicado según su periodicidad?
function tocaEnMes(periodicidad: string, mes: number): boolean {
  if (periodicidad === "mensual") return true;
  if (periodicidad === "trimestral") return [1, 4, 7, 10].includes(mes);
  if (periodicidad === "anual") return mes === 1;
  return true;
}

// Genera en Tesorería los movimientos de gastos fijos de un mes (YYYY-MM),
// a partir de la plantilla activa. No duplica si ya existe el del mes.
export async function generarGastosDelMes(
  ym: string,
): Promise<{ creados: number; existentes: number }> {
  const sb = createAdminClient();
  const mes = Number(ym.slice(5, 7));
  const desde = `${ym}-01`;
  // fin de mes
  const finMes = new Date(Number(ym.slice(0, 4)), mes, 0).getDate();
  const hasta = `${ym}-${String(finMes).padStart(2, "0")}`;

  const { data: plantillas, error } = await sb
    .from("gastos_fijos")
    .select("*")
    .eq("activo", true);
  if (error) throw new Error(error.message);

  const activos = (plantillas ?? []).filter((g) => tocaEnMes(g.periodicidad, mes));

  // Movimientos ya generados en ese mes (por gasto_fijo_id)
  const { data: existentesMov } = await sb
    .from("tesoreria")
    .select("gasto_fijo_id")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .not("gasto_fijo_id", "is", null);
  const yaHechos = new Set((existentesMov ?? []).map((m) => m.gasto_fijo_id));

  const nuevos = activos
    .filter((g) => !yaHechos.has(g.id))
    .map((g) => ({
      concepto: g.concepto,
      tipo: "gasto",
      naturaleza: "gasto_fijo",
      categoria: "Gasto fijo",
      importe: Math.abs(Number(g.importe_mensual)),
      fecha: g.dia_cargo
        ? `${ym}-${String(Math.min(g.dia_cargo, finMes)).padStart(2, "0")}`
        : desde,
      estado: "previsto",
      gasto_fijo_id: g.id,
      computa_contabilidad: true,
    }));

  if (nuevos.length) {
    const { error: insErr } = await sb.from("tesoreria").insert(nuevos);
    if (insErr) throw new Error(insErr.message);
  }
  revalidatePath("/tesoreria");
  revalidatePath("/gastos-fijos");
  revalidatePath("/");
  return { creados: nuevos.length, existentes: activos.length - nuevos.length };
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

// Marca una oportunidad como cobrada al 100%: registra en tesorería el importe
// pendiente como ingreso cobrado y pone su factura (si existe) como cobrada.
export async function marcarCobradoOportunidad(oportunidadId: string) {
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

  const { data: cobros } = await sb
    .from("tesoreria")
    .select("importe")
    .eq("oportunidad_id", oportunidadId)
    .eq("tipo", "ingreso")
    .eq("estado", "cobrado");
  const cobrado = (cobros ?? []).reduce((s, c) => s + Number(c.importe), 0);
  const pendiente = Math.round((t.total - cobrado + Number.EPSILON) * 100) / 100;

  if (pendiente > 0.01) {
    const hoy = new Date().toISOString().slice(0, 10);
    const { error: insErr } = await sb.from("tesoreria").insert({
      concepto: `Cobro final ${op.titulo}`,
      tipo: "ingreso",
      naturaleza: "ingreso_factura",
      categoria: "Cobro alquiler",
      importe: pendiente,
      fecha: hoy,
      estado: "cobrado",
      oportunidad_id: oportunidadId,
      computa_contabilidad: true,
    });
    if (insErr) throw new Error(insErr.message);
  }

  await sb.from("facturas").update({ estado: "cobrada" }).eq("oportunidad_id", oportunidadId);

  revalidatePath("/");
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/facturas");
}
