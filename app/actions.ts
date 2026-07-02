"use server";

import { revalidatePath } from "next/cache";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularTotales } from "@/lib/calc";
import { runSeed, type SeedData } from "@/lib/seed-core";
import { getKmPrecio } from "@/lib/data";

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

  // Lugar: se elige del catálogo o se escribe uno nuevo. Se resuelve por nombre
  // (busca uno existente; si no, lo crea) para no perder el catálogo.
  let lugarId: string | null = (formData.get("lugar_id") as string) || null;
  const lugarNombre = (formData.get("lugar_nombre") as string)?.trim();
  if (lugarNombre) {
    const { data: existente } = await sb
      .from("lugares")
      .select("id")
      .ilike("nombre", lugarNombre)
      .limit(1)
      .maybeSingle();
    if (existente) {
      lugarId = existente.id;
    } else {
      const { data: nuevo, error: lErr } = await sb
        .from("lugares")
        .insert({ nombre: lugarNombre })
        .select("id")
        .single();
      if (lErr) throw new Error(lErr.message);
      lugarId = nuevo.id;
    }
  } else if (formData.has("lugar_nombre")) {
    lugarId = null; // el campo existe y está vacío → sin lugar
  }

  const payload = {
    numero: (formData.get("numero") as string)?.trim(),
    titulo: (formData.get("titulo") as string)?.trim(),
    serie: formData.get("serie") as string,
    tipo_evento: formData.get("tipo_evento") as string,
    tipo_operacion: formData.get("tipo_operacion") as string,
    estado: formData.get("estado") as string,
    cliente_id: (formData.get("cliente_id") as string) || null,
    lugar_id: lugarId,
    fecha_entrada: (formData.get("fecha_entrada") as string) || null,
    canal: (formData.get("canal") as string) || null,
    fecha_evento: (formData.get("fecha_evento") as string) || null,
    fecha_montaje: (formData.get("fecha_montaje") as string) || null,
    fecha_recogida: (formData.get("fecha_recogida") as string) || null,
    responsable: (formData.get("responsable") as string)?.trim() || null,
    n_invitados: numToNull(formData.get("n_invitados")),
    iva_pct: numToNull(formData.get("iva_pct")) ?? 21,
    retencion_pct: numToNull(formData.get("retencion_pct")) ?? 0,
    fianza: numToNull(formData.get("fianza")),
    fecha_devolucion_fianza: (formData.get("fecha_devolucion_fianza") as string) || null,
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
  // Al confirmar por primera vez, sella la fecha de confirmación (tiempo de cierre).
  if (["confirmada", "realizada", "facturada"].includes(estado)) {
    const hoy = new Date().toISOString().slice(0, 10);
    await sb
      .from("oportunidades")
      .update({ fecha_confirmacion: hoy })
      .eq("id", id)
      .is("fecha_confirmacion", null);
  }
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

type LineaInput = { concepto: string; cantidad: number; precio_unitario: number; articulo_id?: string | null };

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
      articulo_id: l.articulo_id ?? null,
    }));
    const { error } = await sb.from("presupuesto_lineas").insert(rows);
    if (error) throw new Error(error.message);
  }

  // Pre-reserva de material "en negociación": sincroniza reservas presupuestado
  // con las líneas del catálogo, para no re-añadirlo a mano y evitar duplicidades.
  try {
    const { data: op } = await sb
      .from("oportunidades")
      .select("fecha_montaje, fecha_recogida, fecha_evento")
      .eq("id", oportunidadId)
      .maybeSingle();
    const salida = op?.fecha_montaje ?? op?.fecha_evento ?? null;
    const devolucion = op?.fecha_recogida ?? op?.fecha_evento ?? null;

    const porArticulo = new Map<string, number>();
    for (const l of limpias) {
      if (l.articulo_id) porArticulo.set(l.articulo_id, (porArticulo.get(l.articulo_id) ?? 0) + (l.cantidad || 1));
    }

    const { data: existentes } = await sb
      .from("reservas_material")
      .select("id, articulo_id, estado")
      .eq("oportunidad_id", oportunidadId);
    const firmes = new Set(
      (existentes ?? []).filter((r) => r.estado !== "presupuestado" && r.articulo_id).map((r) => r.articulo_id),
    );
    const presup = (existentes ?? []).filter((r) => r.estado === "presupuestado");

    const idsBorrar = presup
      .filter((r) => !r.articulo_id || !porArticulo.has(r.articulo_id))
      .map((r) => r.id);
    if (idsBorrar.length) await sb.from("reservas_material").delete().in("id", idsBorrar);

    const yaPresup = new Set(presup.map((r) => r.articulo_id));
    const nuevas = [];
    for (const [articuloId, cantidad] of porArticulo) {
      if (firmes.has(articuloId) || yaPresup.has(articuloId)) continue;
      nuevas.push({
        oportunidad_id: oportunidadId,
        articulo_id: articuloId,
        cantidad,
        fecha_salida: salida,
        fecha_devolucion: devolucion,
        estado: "presupuestado",
      });
    }
    if (nuevas.length) await sb.from("reservas_material").insert(nuevas);
  } catch {
    /* no bloquear el guardado del presupuesto por un fallo en la pre-reserva */
  }

  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/oportunidades");
  revalidatePath("/inventario");
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
    quien_lo_paga: (formData.get("quien_lo_paga") as string)?.trim() || null,
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

// --------------------------- Costes del evento ---------------------------

const revCostes = (opId: string) => {
  revalidatePath(`/oportunidades/${opId}`);
  revalidatePath("/tesoreria");
  revalidatePath("/");
};

// Horas del equipo (coste de personal; no toca tesorería)
export async function crearParteHoras(input: {
  oportunidadId: string;
  equipoId: string | null;
  tarea: string;
  horas: number;
  precioHora: number;
  fecha: string | null;
}) {
  const sb = createAdminClient();
  const { error } = await sb.from("partes_horas").insert({
    oportunidad_id: input.oportunidadId,
    equipo_id: input.equipoId,
    tarea: input.tarea || null,
    horas: Math.max(0, input.horas),
    precio_hora: Math.max(0, input.precioHora),
    fecha: input.fecha || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${input.oportunidadId}`);
}

export async function borrarParteHoras(id: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("partes_horas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
}

// Desplazamiento: calcula gasolina y crea el gasto en Tesorería (gasto de evento).
export async function crearDesplazamiento(input: {
  oportunidadId: string;
  trayecto: string;
  km: number;
  idaVuelta: boolean;
  gasolinaManual: number | null;
  peaje: number;
  parking: number;
  fecha: string | null;
}) {
  const sb = createAdminClient();
  const kmPrecio = await getKmPrecio();
  const kmTotal = (input.km || 0) * (input.idaVuelta ? 2 : 1);
  const gasolina =
    input.gasolinaManual != null && input.gasolinaManual > 0
      ? input.gasolinaManual
      : Math.round(kmTotal * kmPrecio * 100) / 100;
  const total = Math.round((gasolina + (input.peaje || 0) + (input.parking || 0)) * 100) / 100;

  // Gasto en tesorería (gasto de evento, no computa)
  const { data: mov, error: movErr } = await sb
    .from("tesoreria")
    .insert({
      concepto: `Desplazamiento${input.trayecto ? ` · ${input.trayecto}` : ""}`,
      tipo: "gasto",
      naturaleza: "gasto_de_evento",
      categoria: "Desplazamiento",
      importe: total,
      fecha: input.fecha || new Date().toISOString().slice(0, 10),
      estado: "pagado",
      oportunidad_id: input.oportunidadId,
      computa_contabilidad: false,
    })
    .select("id")
    .single();
  if (movErr) throw new Error(movErr.message);

  const { error } = await sb.from("desplazamientos").insert({
    oportunidad_id: input.oportunidadId,
    trayecto: input.trayecto || null,
    km: input.km || null,
    ida_vuelta: input.idaVuelta,
    coste_gasolina: gasolina,
    peaje: input.peaje || null,
    parking: input.parking || null,
    tesoreria_id: mov.id,
    fecha: input.fecha || null,
  });
  if (error) throw new Error(error.message);
  revCostes(input.oportunidadId);
}

export async function borrarDesplazamiento(id: string, tesoreriaId: string | null, oportunidadId: string) {
  const sb = createAdminClient();
  if (tesoreriaId) await sb.from("tesoreria").delete().eq("id", tesoreriaId);
  const { error } = await sb.from("desplazamientos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revCostes(oportunidadId);
}

// Compra / material del evento -> gasto en Tesorería (gasto de evento).
export async function crearCompra(input: {
  oportunidadId: string;
  concepto: string;
  importe: number;
  proveedorId: string | null;
  fecha: string | null;
}) {
  const sb = createAdminClient();
  const { error } = await sb.from("tesoreria").insert({
    concepto: input.concepto,
    tipo: "gasto",
    naturaleza: "gasto_de_evento",
    categoria: "Material",
    importe: Math.abs(input.importe),
    fecha: input.fecha || new Date().toISOString().slice(0, 10),
    estado: "pagado",
    oportunidad_id: input.oportunidadId,
    proveedor_id: input.proveedorId,
    computa_contabilidad: false,
  });
  if (error) throw new Error(error.message);
  revCostes(input.oportunidadId);
}

export async function borrarCompra(tesoreriaId: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("tesoreria").delete().eq("id", tesoreriaId);
  if (error) throw new Error(error.message);
  revCostes(oportunidadId);
}

export async function guardarKmPrecio(valor: number) {
  const sb = createAdminClient();
  const { error } = await sb
    .from("ajustes")
    .upsert({ clave: "km_precio", valor: String(valor), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function guardarDistanciaLugar(lugarId: string, km: number | null, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("lugares").update({ distancia_km: km }).eq("id", lugarId);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
}

// --------------------------- Reservas de material ---------------------------

export async function crearReserva(input: {
  oportunidadId: string;
  articuloId: string;
  cantidad: number;
  fechaSalida: string | null;
  fechaDevolucion: string | null;
  notas?: string | null;
}) {
  const sb = createAdminClient();
  const { error } = await sb.from("reservas_material").insert({
    oportunidad_id: input.oportunidadId,
    articulo_id: input.articuloId,
    cantidad: Math.max(1, Math.round(input.cantidad)),
    fecha_salida: input.fechaSalida || null,
    fecha_devolucion: input.fechaDevolucion || null,
    estado: "reservado",
    notas: input.notas || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${input.oportunidadId}`);
  revalidatePath("/inventario");
}

export async function cambiarEstadoReserva(id: string, estado: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("reservas_material").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/inventario");
}

export async function borrarReserva(id: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("reservas_material").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/inventario");
}

// --------------------------- Equipo ---------------------------

export async function guardarEquipo(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const numOrNull = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? Number(s) : null;
  };
  const payload = {
    nombre: (formData.get("nombre") as string)?.trim(),
    rol: (formData.get("rol") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    telefono: (formData.get("telefono") as string)?.trim() || null,
    porcentaje: numOrNull(formData.get("porcentaje")),
    precio_hora: numOrNull(formData.get("precio_hora")),
    activo: formData.get("activo") === "on",
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.nombre) throw new Error("El nombre es obligatorio.");

  if (id) {
    const { error } = await sb.from("equipo").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("equipo").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/equipo");
}

export async function borrarEquipo(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("equipo").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/equipo");
}

// --------------------------- Inventario ---------------------------

export async function guardarInventario(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const numOrNull = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? Number(s) : null;
  };
  const payload = {
    articulo: (formData.get("articulo") as string)?.trim(),
    categoria: (formData.get("categoria") as string)?.trim() || null,
    cantidad_total: numOrNull(formData.get("cantidad_total")),
    coste_unitario: numOrNull(formData.get("coste_unitario")),
    precio_alquiler: numOrNull(formData.get("precio_alquiler")),
    fianza_sugerida: numOrNull(formData.get("fianza_sugerida")),
    fianza_especial: formData.get("fianza_especial") === "on",
    ubicacion: (formData.get("ubicacion") as string)?.trim() || null,
    estado: (formData.get("estado") as string) || "disponible",
    foto_url: (formData.get("foto_url") as string)?.trim() || null,
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.articulo) throw new Error("El nombre del artículo es obligatorio.");

  if (id) {
    const { error } = await sb.from("inventario").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("inventario").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/inventario");
}

export async function borrarInventario(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("inventario").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventario");
}

// --------------------------- Comisiones ---------------------------

export async function guardarComisionConfig(formData: FormData) {
  const sb = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    equipo_id: (formData.get("equipo_id") as string) || null,
    tipo_evento: (formData.get("tipo_evento") as string) || null, // "" => todos
    porcentaje: Math.abs(Number(formData.get("porcentaje") || 0)),
    activo: formData.get("activo") === "on",
  };
  if (!payload.equipo_id) throw new Error("Elige una persona.");

  if (id) {
    const { error } = await sb.from("comisiones_config").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("comisiones_config").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/comisiones");
}

export async function borrarComisionConfig(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("comisiones_config").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/comisiones");
}

// Registra el pago de una comisión: crea el gasto en Tesorería (naturaleza
// comision, NO computa en contabilidad) y guarda la comisión como pagada.
export async function pagarComision(input: {
  oportunidadId: string;
  equipoId: string;
  nombre: string;
  evento: string;
  base: number;
  porcentaje: number;
  importe: number;
}) {
  const sb = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: mov, error: movErr } = await sb
    .from("tesoreria")
    .insert({
      concepto: `Comisión ${input.nombre} · ${input.evento}`,
      tipo: "gasto",
      naturaleza: "comision",
      categoria: "Comisión",
      importe: Math.abs(input.importe),
      fecha: hoy,
      estado: "pagado",
      oportunidad_id: input.oportunidadId,
      computa_contabilidad: false,
    })
    .select("id")
    .single();
  if (movErr) throw new Error(movErr.message);

  const { error: comErr } = await sb.from("comisiones").insert({
    oportunidad_id: input.oportunidadId,
    equipo_id: input.equipoId,
    base: input.base,
    porcentaje: input.porcentaje,
    importe: Math.abs(input.importe),
    estado: "pagada",
    fecha_devengo: hoy,
    pagada_el: hoy,
    tesoreria_id: mov.id,
  });
  if (comErr) throw new Error(comErr.message);

  revalidatePath("/comisiones");
  revalidatePath("/tesoreria");
}

export async function desmarcarComision(comisionId: string, tesoreriaId: string | null) {
  const sb = createAdminClient();
  if (tesoreriaId) await sb.from("tesoreria").delete().eq("id", tesoreriaId);
  const { error } = await sb.from("comisiones").delete().eq("id", comisionId);
  if (error) throw new Error(error.message);
  revalidatePath("/comisiones");
  revalidatePath("/tesoreria");
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
