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

  // Numeración correlativa de presupuestos: si al crear se deja el número
  // vacío, se asigna el siguiente NNNN/AAAA del año en curso (p. ej. 0134/2026).
  let numero = (formData.get("numero") as string)?.trim();
  if (!numero && !id) {
    const year = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" })
      .format(new Date())
      .slice(0, 4);
    const { data: nums } = await sb
      .from("oportunidades")
      .select("numero")
      .like("numero", `%/${year}`);
    // Solo cuentan los números propios de hasta 4 cifras (los externos tipo
    // 26101/2026 no arrastran el correlativo).
    const max = (nums ?? []).reduce((mx, r) => {
      const m = (r.numero as string | null)?.match(/^(\d{1,4})\/\d{4}$/);
      return m ? Math.max(mx, Number(m[1])) : mx;
    }, 0);
    numero = `${String(max + 1).padStart(4, "0")}/${year}`;
  }

  const payload = {
    numero,
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
    iva_pct: Math.round(numToNull(formData.get("iva_pct")) ?? 21),
    retencion_pct: Math.round(numToNull(formData.get("retencion_pct")) ?? 0),
    fianza: numToNull(formData.get("fianza")),
    fecha_devolucion_fianza: (formData.get("fecha_devolucion_fianza") as string) || null,
    pago_a_dias: numToNull(formData.get("pago_a_dias")) ?? 0,
    notas: (formData.get("notas") as string)?.trim() || null,
  };
  if (!payload.titulo) throw new Error("El título es obligatorio.");
  if (!payload.numero) throw new Error("No se pudo asignar el número; escríbelo a mano.");

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

// Marca el presupuesto como enviado (y avanza el estado si aún estaba en
// fases tempranas del pipeline). Se usa desde el botón de enviar por email.
export async function marcarPresupuestoEnviado(id: string) {
  const sb = createAdminClient();
  const { data: op, error } = await sb
    .from("oportunidades")
    .select("estado")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const patch: Record<string, unknown> = { presupuesto_enviado: true };
  if (op && ["nueva", "contestada", "en_conversacion"].includes(op.estado)) {
    patch.estado = "presupuesto_enviado";
  }
  const { error: updErr } = await sb.from("oportunidades").update(patch).eq("id", id);
  if (updErr) throw new Error(updErr.message);
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/oportunidades");
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

type LineaInput = { concepto: string; cantidad: number; precio_unitario: number; articulo_id?: string | null; bloque?: string | null; via?: string | null; foto?: string | null };

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
    // IVA y retención siempre enteros (21, 10, 15…).
    if (typeof ivaPct === "number") patch.iva_pct = Math.round(ivaPct);
    if (typeof retPct === "number") patch.retencion_pct = Math.round(retPct);
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
      bloque: l.bloque?.trim() || null,
      via: l.via === "efectivo" ? "efectivo" : "factura",
      foto: l.foto?.trim() || null,
    }));
    const { error } = await sb.from("presupuesto_lineas").insert(rows);
    if (error) {
      if (/foto/.test(error.message) && /column/i.test(error.message)) {
        throw new Error("Falta ejecutar la migración 022 (foto por línea) en Supabase.");
      }
      throw new Error(error.message);
    }
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

// Marca un movimiento (gasto pendiente) como pagado en un clic.
export async function marcarMovimientoPagado(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("tesoreria").update({ estado: "pagado" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tesoreria");
  revalidatePath("/");
}

// --------------------------- Fidelización -------------------------------

// Marca en una oportunidad si la reseña está pedida o conseguida.
export async function marcarResena(
  oportunidadId: string,
  campo: "resena_pedida" | "resena_conseguida",
  valor: boolean,
) {
  const sb = createAdminClient();
  // Conseguir una reseña implica que también se pidió.
  const patch =
    campo === "resena_conseguida" && valor
      ? { resena_conseguida: true, resena_pedida: true }
      : { [campo]: valor };
  const { error } = await sb.from("oportunidades").update(patch).eq("id", oportunidadId);
  if (error) throw new Error(error.message);
  revalidatePath("/fidelizacion");
}

// Marca en un cliente si se le pidió recomendación o si ya nos ha recomendado.
export async function marcarRecomendacion(
  clienteId: string,
  campo: "recomendacion_pedida" | "nos_ha_recomendado",
  valor: boolean,
) {
  const sb = createAdminClient();
  const { error } = await sb.from("clientes").update({ [campo]: valor }).eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath("/fidelizacion");
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

// Reuniones con clientes (presenciales u online) ligadas a la oportunidad.
export async function crearReunion(input: {
  oportunidadId: string;
  fecha: string;
  hora: string | null;
  modalidad: string;
  atendidaPor: string | null;
  enlace: string | null;
  lugar: string | null;
  notas: string | null;
}) {
  const sb = createAdminClient();
  const { error } = await sb.from("reuniones").insert({
    oportunidad_id: input.oportunidadId,
    fecha: input.fecha,
    hora: input.hora || null,
    modalidad: input.modalidad === "online" ? "online" : "presencial",
    atendida_por: input.atendidaPor || null,
    enlace: input.enlace || null,
    lugar: input.lugar || null,
    notas: input.notas || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${input.oportunidadId}`);
  revalidatePath("/calendario");
}

export async function toggleReunionRealizada(id: string, realizada: boolean, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("reuniones").update({ realizada }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/calendario");
}

export async function borrarReunion(id: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("reuniones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/calendario");
}

// ---------------------------- Tareas del equipo ----------------------------

export async function crearTarea(input: {
  titulo: string;
  descripcion: string | null;
  asignadaA: string;
  creadaPor: string | null;
  prioridad: string;
  fechaLimite: string | null;
  oportunidadId: string | null;
}) {
  const sb = createAdminClient();
  if (!input.asignadaA.trim()) throw new Error("Di para quién es la tarea.");
  const { error } = await sb.from("tareas").insert({
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    asignada_a: input.asignadaA.trim(),
    creada_por: input.creadaPor?.trim() || null,
    prioridad: ["baja", "normal", "alta", "urgente"].includes(input.prioridad) ? input.prioridad : "normal",
    fecha_limite: input.fechaLimite || null,
    oportunidad_id: input.oportunidadId || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/tareas");
  revalidatePath("/");
}

export async function actualizarTarea(
  id: string,
  patch: {
    titulo?: string;
    descripcion?: string | null;
    prioridad?: string;
    fechaLimite?: string | null;
    estado?: string;
    comentario?: string | null;
  },
) {
  const sb = createAdminClient();
  const upd: Record<string, unknown> = {};
  if (patch.titulo !== undefined) upd.titulo = patch.titulo.trim();
  if (patch.descripcion !== undefined) upd.descripcion = patch.descripcion?.trim() || null;
  if (patch.prioridad !== undefined) upd.prioridad = patch.prioridad;
  if (patch.fechaLimite !== undefined) upd.fecha_limite = patch.fechaLimite || null;
  if (patch.comentario !== undefined) upd.comentario = patch.comentario?.trim() || null;
  if (patch.estado !== undefined) {
    upd.estado = patch.estado;
    upd.completada_en = patch.estado === "hecha" ? new Date().toISOString() : null;
  }
  const { error } = await sb.from("tareas").update(upd).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tareas");
  revalidatePath("/");
}

export async function borrarTarea(id: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("tareas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tareas");
  revalidatePath("/");
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
  quienLoPaga?: string | null;
}) {
  const sb = createAdminClient();
  const kmPrecio = await getKmPrecio();
  const kmTotal = (input.km || 0) * (input.idaVuelta ? 2 : 1);
  const gasolina =
    input.gasolinaManual != null && input.gasolinaManual > 0
      ? input.gasolinaManual
      : Math.round(kmTotal * kmPrecio * 100) / 100;
  const total = Math.round((gasolina + (input.peaje || 0) + (input.parking || 0)) * 100) / 100;

  // Gasto en tesorería (gasto de evento, no computa). Si lo adelantó una
  // persona (socio o externo) queda como reembolso pendiente → deudas.
  const quien = input.quienLoPaga?.trim() || null;
  const { data: mov, error: movErr } = await sb
    .from("tesoreria")
    .insert({
      concepto: `Desplazamiento${input.trayecto ? ` · ${input.trayecto}` : ""}`,
      tipo: "gasto",
      naturaleza: "gasto_de_evento",
      categoria: "Desplazamiento",
      importe: total,
      fecha: input.fecha || new Date().toISOString().slice(0, 10),
      estado: quien ? "previsto" : "pagado",
      quien_lo_paga: quien,
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
  proveedorNuevo?: string | null;
  quienLoPaga?: string | null;
  fecha: string | null;
}) {
  const sb = createAdminClient();

  // Proveedor nuevo escrito a mano: se reutiliza si ya existe uno con ese
  // nombre; si no, se crea la ficha al vuelo.
  let proveedorId = input.proveedorId;
  const nuevo = input.proveedorNuevo?.trim();
  if (!proveedorId && nuevo) {
    const { data: existente } = await sb
      .from("proveedores")
      .select("id")
      .ilike("nombre", nuevo)
      .limit(1)
      .maybeSingle();
    if (existente) {
      proveedorId = existente.id;
    } else {
      const { data: creado, error: provErr } = await sb
        .from("proveedores")
        .insert({ nombre: nuevo })
        .select("id")
        .single();
      if (provErr) throw new Error(provErr.message);
      proveedorId = creado.id;
    }
  }

  const quien = input.quienLoPaga?.trim() || null;
  const { error } = await sb.from("tesoreria").insert({
    concepto: input.concepto,
    tipo: "gasto",
    naturaleza: "gasto_de_evento",
    categoria: "Material",
    importe: Math.abs(input.importe),
    fecha: input.fecha || new Date().toISOString().slice(0, 10),
    estado: quien ? "previsto" : "pagado",
    quien_lo_paga: quien,
    oportunidad_id: input.oportunidadId,
    proveedor_id: proveedorId,
    computa_contabilidad: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/proveedores");
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

// ---------------------- Costes estimados y tickets ----------------------

// Coste estimado antes del presupuesto (escandallo previsto). No toca la
// contabilidad: solo sirve para cuadrar el precio del cliente. Con detalle:
// cantidad × precio unitario y tipo de gasto ("4 ramos de petunias a 2 €").
export async function crearCosteEstimado(input: {
  oportunidadId: string;
  concepto: string;
  cantidad?: number;
  precioUnitario?: number;
  categoria?: string | null;
  importe?: number; // si no se pasa, cantidad × precio unitario
}) {
  const sb = createAdminClient();
  const cantidad = Number(input.cantidad ?? 1) || 1;
  const precio = Number(input.precioUnitario ?? 0);
  const importe = input.importe ?? cantidad * precio;
  if (!input.concepto.trim() || !(importe > 0)) throw new Error("Falta concepto o importe.");
  const { error } = await sb.from("costes_estimados").insert({
    oportunidad_id: input.oportunidadId,
    concepto: input.concepto.trim(),
    cantidad,
    precio_unitario: precio > 0 ? precio : importe / cantidad,
    categoria: input.categoria || null,
    importe,
  });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) {
      throw new Error("Falta ejecutar la migración 020 (costes estimados) en Supabase.");
    }
    if (/cantidad|categoria|precio_unitario/.test(error.message)) {
      throw new Error("Falta ejecutar la migración 021 (detalle de estimados) en Supabase.");
    }
    throw new Error(error.message);
  }
  revalidatePath(`/oportunidades/${input.oportunidadId}`);
}

export async function borrarCosteEstimado(id: string, oportunidadId: string) {
  const sb = createAdminClient();
  const { error } = await sb.from("costes_estimados").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
}

// Parámetros de la estimación: % de contingencia y margen objetivo.
export async function guardarParamsCostes(
  oportunidadId: string,
  contingenciaPct: number,
  margenObjetivoPct: number,
) {
  const sb = createAdminClient();
  const { error } = await sb
    .from("oportunidades")
    .update({
      contingencia_pct: Math.max(0, contingenciaPct),
      margen_objetivo_pct: Math.min(95, Math.max(0, margenObjetivoPct)),
    })
    .eq("id", oportunidadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${oportunidadId}`);
}

// Adjunta la foto del ticket/justificante a un movimiento de tesorería
// (bucket público "tickets" en Supabase Storage).
export async function adjuntarTicket(formData: FormData) {
  const sb = createAdminClient();
  const tesoreriaId = String(formData.get("tesoreriaId") ?? "");
  const oportunidadId = String(formData.get("oportunidadId") ?? "");
  const file = formData.get("ticket") as File | null;
  if (!tesoreriaId || !file || file.size === 0) throw new Error("Falta el archivo del ticket.");
  if (file.size > 10 * 1024 * 1024) throw new Error("El ticket no puede pesar más de 10 MB.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ruta = `${tesoreriaId}.${ext || "jpg"}`;
  const { error: upErr } = await sb.storage
    .from("tickets")
    .upload(ruta, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) {
    if (/bucket/i.test(upErr.message)) {
      throw new Error("Falta ejecutar la migración 020 (bucket de tickets) en Supabase.");
    }
    throw new Error(upErr.message);
  }
  const { data: pub } = sb.storage.from("tickets").getPublicUrl(ruta);
  const { error } = await sb
    .from("tesoreria")
    .update({ ticket_url: pub.publicUrl })
    .eq("id", tesoreriaId);
  if (error) throw new Error(error.message);
  if (oportunidadId) revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/tesoreria");
}

// Cierra (o reabre) un evento: valida los gastos post-evento y congela la
// ficha de costes; el margen pasa a ser el definitivo.
export async function cerrarEvento(oportunidadId: string, cerrar: boolean) {
  const sb = createAdminClient();
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const { error } = await sb
    .from("oportunidades")
    .update({ cerrada: cerrar, cerrada_fecha: cerrar ? hoy : null })
    .eq("id", oportunidadId);
  if (error) {
    if (/cerrada/.test(error.message) && /column/i.test(error.message)) {
      throw new Error("Falta ejecutar la migración 020 (cierre de eventos) en Supabase.");
    }
    throw new Error(error.message);
  }
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/oportunidades");
}

// Sube una imagen para una línea de presupuesto (desde el ordenador) al
// bucket del catálogo, en la carpeta presu/, y devuelve su URL pública.
export async function subirFotoPresupuesto(formData: FormData): Promise<string> {
  const sb = createAdminClient();
  const file = formData.get("foto") as File | null;
  if (!file || file.size === 0) throw new Error("Falta el archivo de la imagen.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen no puede pesar más de 10 MB.");
  if (!file.type.startsWith("image/")) throw new Error("El archivo tiene que ser una imagen.");

  const BUCKET = process.env.NEXT_PUBLIC_CATALOGO_BUCKET || "Catalogo fotos 1";
  const limpio = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
  const ruta = `presu/${Date.now()}-${limpio || "imagen.jpg"}`;
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(ruta, file, { contentType: file.type || undefined });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(ruta);
  return pub.publicUrl;
}

// ---------------------- Versiones de presupuesto ----------------------

// Guarda el presupuesto actual como una versión (V1, V2…): foto fija de las
// líneas para conservar lo que se envió al cliente y poder volver atrás.
export async function guardarVersionPresupuesto(oportunidadId: string, notas: string | null) {
  const sb = createAdminClient();
  const { data: op, error } = await sb
    .from("oportunidades")
    .select("id, iva_pct, retencion_pct, presupuesto_lineas(*)")
    .eq("id", oportunidadId)
    .single();
  if (error) throw new Error(error.message);

  const lineas = (op.presupuesto_lineas ?? [])
    .slice()
    .sort((a: { orden?: number }, b: { orden?: number }) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((l: LineaInput & { bloque?: string | null }) => ({
      concepto: l.concepto,
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario),
      bloque: l.bloque ?? null,
      via: l.via === "efectivo" ? "efectivo" : "factura",
      foto: l.foto ?? null,
    }));
  if (!lineas.length) throw new Error("El presupuesto no tiene líneas que guardar.");

  const t = calcularTotales(lineas, op.iva_pct, op.retencion_pct);
  const { data: vers } = await sb
    .from("presupuesto_versiones")
    .select("version")
    .eq("oportunidad_id", oportunidadId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (vers?.version ?? 0) + 1;

  const { error: insErr } = await sb.from("presupuesto_versiones").insert({
    oportunidad_id: oportunidadId,
    version,
    notas: notas?.trim() || null,
    iva_pct: op.iva_pct,
    retencion_pct: op.retencion_pct,
    lineas,
    total: t.total,
  });
  if (insErr) {
    if (insErr.code === "42P01" || /does not exist/i.test(insErr.message)) {
      throw new Error("Falta ejecutar la migración 019 (tabla presupuesto_versiones) en Supabase.");
    }
    throw new Error(insErr.message);
  }
  revalidatePath(`/oportunidades/${oportunidadId}`);
  return version;
}

// Vuelve a una versión guardada: sustituye las líneas vivas del presupuesto
// por las de la versión (antes de pisar nada conviene guardar la actual).
export async function restaurarVersionPresupuesto(versionId: string) {
  const sb = createAdminClient();
  const { data: v, error } = await sb
    .from("presupuesto_versiones")
    .select("*")
    .eq("id", versionId)
    .single();
  if (error) throw new Error(error.message);

  const { error: delErr } = await sb
    .from("presupuesto_lineas")
    .delete()
    .eq("oportunidad_id", v.oportunidad_id);
  if (delErr) throw new Error(delErr.message);

  const lineas = (v.lineas ?? []) as {
    concepto: string;
    cantidad: number;
    precio_unitario: number;
    bloque?: string | null;
    via?: string | null;
    foto?: string | null;
  }[];
  if (lineas.length) {
    const { error: insErr } = await sb.from("presupuesto_lineas").insert(
      lineas.map((l, i) => ({
        oportunidad_id: v.oportunidad_id,
        concepto: l.concepto,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        bloque: l.bloque ?? null,
        via: l.via === "efectivo" ? "efectivo" : "factura",
        foto: l.foto ?? null,
        orden: i,
      })),
    );
    if (insErr) throw new Error(insErr.message);
  }
  await sb
    .from("oportunidades")
    .update({ iva_pct: v.iva_pct, retencion_pct: v.retencion_pct })
    .eq("id", v.oportunidad_id);
  revalidatePath(`/oportunidades/${v.oportunidad_id}`);
}

export async function borrarVersionPresupuesto(versionId: string) {
  const sb = createAdminClient();
  const { data: v, error } = await sb
    .from("presupuesto_versiones")
    .delete()
    .eq("id", versionId)
    .select("oportunidad_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${v.oportunidad_id}`);
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
      via: l.via ?? "factura",
    })),
    op.iva_pct,
    op.retencion_pct,
  );

  // Vencimiento según las condiciones de pago del cliente (pago a X días).
  const hoyMadrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const plazoPago = Number(op.pago_a_dias ?? 0);
  const vence = new Date(hoyMadrid + "T00:00:00Z");
  vence.setUTCDate(vence.getUTCDate() + (plazoPago > 0 ? plazoPago : 0));

  // La factura solo recoge la parte facturable (las líneas por vía efectivo
  // van a la contabilidad de amigos, sin IVA).
  if (t.baseFactura <= 0) {
    throw new Error("Este presupuesto no tiene líneas facturables (todo va por efectivo).");
  }

  const fechaVencimiento = vence.toISOString().slice(0, 10);

  // Número de factura en su propia serie correlativa AANNN (26016, 26017…),
  // independiente de la numeración de presupuestos.
  const yy = hoyMadrid.slice(2, 4);
  const { data: numsFac } = await sb.from("facturas").select("numero").like("numero", `${yy}%`);
  const maxFac = (numsFac ?? []).reduce((mx, r) => {
    const n = r.numero as string | null;
    return n && /^\d{5}$/.test(n) && n.startsWith(yy) ? Math.max(mx, Number(n.slice(2))) : mx;
  }, 0);
  const numeroFactura = `${yy}${String(maxFac + 1).padStart(3, "0")}`;

  // Foto fija de TODAS las líneas (con su vía): el documento queda congelado
  // aunque después se edite el presupuesto. Las líneas en efectivo se guardan
  // como parte interna (no salen en el documento del cliente).
  const lineasSnap = (op.presupuesto_lineas ?? [])
    .slice()
    .sort((a: { orden?: number }, b: { orden?: number }) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((l: LineaInput & { bloque?: string | null }) => ({
      concepto: l.concepto,
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario),
      bloque: l.bloque ?? null,
      via: l.via === "efectivo" ? "efectivo" : "factura",
    }));

  const { data: facNueva, error: insErr } = await sb
    .from("facturas")
    .insert({
      numero: numeroFactura,
      oportunidad_id: op.id,
      cliente_id: op.cliente_id,
      base_imponible: t.baseFactura,
      iva: t.iva,
      retencion: t.retencion,
      total: t.totalFactura,
      estado: "emitida",
      fecha_vencimiento: fechaVencimiento,
      lineas: lineasSnap,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const facturaId = facNueva.id as string;

  // Círculo completo: la factura deja su cobro previsto en tesorería con
  // fecha del vencimiento (sale en Tesorería, Calendario y ficha → Cobros).
  const { data: previstoExistente } = await sb
    .from("tesoreria")
    .select("id")
    .eq("oportunidad_id", op.id)
    .eq("naturaleza", "ingreso_factura")
    .eq("estado", "previsto")
    .limit(1)
    .maybeSingle();
  if (!previstoExistente) {
    const { error: tesErr } = await sb.from("tesoreria").insert({
      concepto: `Cobro factura ${numeroFactura} · ${op.titulo}`,
      tipo: "ingreso",
      naturaleza: "ingreso_factura",
      categoria: "Cobro factura",
      importe: t.totalFactura,
      fecha: fechaVencimiento,
      estado: "previsto",
      oportunidad_id: op.id,
      factura_id: facturaId,
      computa_contabilidad: true,
    });
    if (tesErr) throw new Error(tesErr.message);
  }

  // Parte en efectivo (sin IVA): deja su propio cobro previsto en la
  // contabilidad de amigos, si no existe ya.
  if (t.efectivo > 0) {
    const { data: prevAmigos } = await sb
      .from("tesoreria")
      .select("id")
      .eq("oportunidad_id", op.id)
      .eq("naturaleza", "amigos")
      .eq("tipo", "ingreso")
      .limit(1)
      .maybeSingle();
    if (!prevAmigos) {
      await sb.from("tesoreria").insert({
        concepto: `Parte en efectivo (sin IVA) · ${op.titulo}`,
        tipo: "ingreso",
        naturaleza: "amigos",
        categoria: "Cobro en efectivo",
        importe: t.efectivo,
        fecha: op.fecha_evento ?? fechaVencimiento,
        estado: "previsto",
        oportunidad_id: op.id,
        factura_id: facturaId,
        computa_contabilidad: false,
      });
    }
  }

  await sb.from("oportunidades").update({ estado: "facturada" }).eq("id", op.id);
  revalidatePath("/facturas");
  revalidatePath("/tesoreria");
  revalidatePath("/contabilidad");
  revalidatePath(`/oportunidades/${op.id}`);
  revalidatePath("/oportunidades");
}

export async function marcarFacturaCobrada(id: string, cobrada: boolean) {
  const sb = createAdminClient();
  const { data: f, error } = await sb
    .from("facturas")
    .update({ estado: cobrada ? "cobrada" : "emitida" })
    .eq("id", id)
    .select("oportunidad_id, fecha_vencimiento")
    .single();
  if (error) throw new Error(error.message);

  // Sincroniza el cobro previsto de tesorería: al cobrar pasa a "cobrado" con
  // fecha de hoy (y entra en contabilidad); al reabrir vuelve a "previsto"
  // con la fecha del vencimiento. Busca por factura (facturas nuevas) y por
  // oportunidad (facturas antiguas sin enlace directo).
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const patch = cobrada
    ? { estado: "cobrado", fecha: hoy }
    : { estado: "previsto", fecha: f?.fecha_vencimiento ?? hoy };
  const estadoPrevio = cobrada ? "previsto" : "cobrado";
  await sb
    .from("tesoreria")
    .update(patch)
    .eq("factura_id", id)
    .eq("naturaleza", "ingreso_factura")
    .eq("estado", estadoPrevio);
  if (f?.oportunidad_id) {
    await sb
      .from("tesoreria")
      .update(patch)
      .eq("oportunidad_id", f.oportunidad_id)
      .eq("naturaleza", "ingreso_factura")
      .eq("estado", estadoPrevio);
  }
  revalidatePath("/facturas");
  revalidatePath("/tesoreria");
  revalidatePath("/contabilidad");
  revalidatePath("/");
}

// Crea una factura a mano, sin pasar por una oportunidad: datos fiscales del
// cliente, fechas y líneas con su vía. Las líneas 'factura' llevan IVA y son
// las únicas que ve el cliente en el documento; las líneas 'efectivo' quedan
// como parte interna y su importe va directo a la contabilidad de amigos.
export async function crearFactura(input: {
  clienteId: string | null;
  nuevoCliente: {
    nombre: string;
    tipo: string;
    nif: string;
    direccion: string;
    localidad: string;
    email: string;
  } | null;
  // Completa a mano los datos fiscales de un cliente existente que no los tenga.
  fiscalPatch?: { nif: string; direccion: string; localidad: string } | null;
  // Presupuesto de origen: la factura queda enlazada a su oportunidad.
  oportunidadId?: string | null;
  numero: string | null;
  fechaEmision: string;
  fechaVencimiento: string | null;
  ivaPct: number;
  retPct: number;
  lineas: { concepto: string; cantidad: number; precio_unitario: number; via?: string | null }[];
  cobradaFactura: boolean;
  cobradoEfectivo: boolean;
  notas: string | null;
}): Promise<string> {
  const sb = createAdminClient();
  if (!input.fechaEmision) throw new Error("Falta la fecha de emisión.");

  const lineas = input.lineas
    .map((l) => ({
      concepto: l.concepto.trim(),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario),
      bloque: null as string | null,
      via: l.via === "efectivo" ? "efectivo" : "factura",
    }))
    .filter((l) => l.concepto && l.cantidad > 0);
  if (!lineas.length) throw new Error("Añade al menos una línea.");

  const t = calcularTotales(lineas, input.ivaPct, input.retPct);
  if (t.baseFactura <= 0) {
    throw new Error(
      "Una factura necesita al menos una línea con vía factura. Si todo va en efectivo, apúntalo en Tesorería (naturaleza amigos) o en el plan de pagos de la oportunidad.",
    );
  }

  // Cliente: existente o alta nueva con sus datos fiscales.
  let clienteId = input.clienteId;
  if (!clienteId && input.nuevoCliente?.nombre?.trim()) {
    const nc = input.nuevoCliente;
    const { data: cli, error: cliErr } = await sb
      .from("clientes")
      .insert({
        nombre: nc.nombre.trim(),
        tipo: nc.tipo === "empresa" ? "empresa" : "particular",
        nif_cif: nc.nif?.trim() || null,
        direccion: nc.direccion?.trim() || null,
        localidad: nc.localidad?.trim() || null,
        email: nc.email?.trim() || null,
      })
      .select("id")
      .single();
    if (cliErr) throw new Error(cliErr.message);
    clienteId = cli.id as string;
  }
  if (!clienteId) throw new Error("Elige un cliente o da de alta uno nuevo.");

  // Datos fiscales completados a mano sobre un cliente existente.
  if (input.clienteId && input.fiscalPatch) {
    const fp = input.fiscalPatch;
    const patch: Record<string, string> = {};
    if (fp.nif?.trim()) patch.nif_cif = fp.nif.trim();
    if (fp.direccion?.trim()) patch.direccion = fp.direccion.trim();
    if (fp.localidad?.trim()) patch.localidad = fp.localidad.trim();
    if (Object.keys(patch).length) {
      const { error: fpErr } = await sb.from("clientes").update(patch).eq("id", input.clienteId);
      if (fpErr) throw new Error(fpErr.message);
    }
  }

  // Número: manual (comprobando que no exista) o el siguiente de la serie AANNN.
  let numero = input.numero?.trim() || "";
  if (numero) {
    const { data: dup } = await sb
      .from("facturas")
      .select("id")
      .eq("numero", numero)
      .limit(1)
      .maybeSingle();
    if (dup) throw new Error(`Ya existe una factura con el número ${numero}.`);
  } else {
    const yy = input.fechaEmision.slice(2, 4);
    const { data: numsFac } = await sb.from("facturas").select("numero").like("numero", `${yy}%`);
    const maxFac = (numsFac ?? []).reduce((mx, r) => {
      const n = r.numero as string | null;
      return n && /^\d{5}$/.test(n) && n.startsWith(yy) ? Math.max(mx, Number(n.slice(2))) : mx;
    }, 0);
    numero = `${yy}${String(maxFac + 1).padStart(3, "0")}`;
  }

  const { data: fac, error: insErr } = await sb
    .from("facturas")
    .insert({
      numero,
      cliente_id: clienteId,
      oportunidad_id: input.oportunidadId || null,
      fecha_emision: input.fechaEmision,
      fecha_vencimiento: input.fechaVencimiento || null,
      base_imponible: t.baseFactura,
      iva: t.iva,
      retencion: t.retencion,
      total: t.totalFactura,
      estado: input.cobradaFactura ? "cobrada" : "emitida",
      notas: input.notas?.trim() || null,
      lineas,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const facturaId = fac.id as string;

  // Movimiento de la parte facturada (contabilidad oficial).
  const fechaCobroFactura = input.cobradaFactura
    ? input.fechaEmision
    : input.fechaVencimiento || input.fechaEmision;
  const { error: tesErr } = await sb.from("tesoreria").insert({
    concepto: `Cobro factura ${numero}`,
    tipo: "ingreso",
    naturaleza: "ingreso_factura",
    categoria: "Cobro factura",
    importe: t.totalFactura,
    fecha: fechaCobroFactura,
    estado: input.cobradaFactura ? "cobrado" : "previsto",
    cliente_id: clienteId,
    oportunidad_id: input.oportunidadId || null,
    factura_id: facturaId,
    computa_contabilidad: true,
  });
  if (tesErr) throw new Error(tesErr.message);

  // Parte en efectivo (interna, sin IVA) → contabilidad de amigos.
  if (t.efectivo > 0) {
    const { error: efErr } = await sb.from("tesoreria").insert({
      concepto: `Parte en efectivo (sin IVA) · Factura ${numero}`,
      tipo: "ingreso",
      naturaleza: "amigos",
      categoria: "Cobro en efectivo",
      importe: t.efectivo,
      fecha: input.cobradoEfectivo ? input.fechaEmision : fechaCobroFactura,
      estado: input.cobradoEfectivo ? "cobrado" : "previsto",
      cliente_id: clienteId,
      oportunidad_id: input.oportunidadId || null,
      factura_id: facturaId,
      computa_contabilidad: false,
    });
    if (efErr) throw new Error(efErr.message);
  }

  // Si viene de una oportunidad confirmada/realizada, pasa a "facturada".
  if (input.oportunidadId) {
    await sb
      .from("oportunidades")
      .update({ estado: "facturada" })
      .eq("id", input.oportunidadId)
      .in("estado", ["confirmada", "realizada"]);
    revalidatePath(`/oportunidades/${input.oportunidadId}`);
    revalidatePath("/oportunidades");
  }

  revalidatePath("/facturas");
  revalidatePath("/tesoreria");
  revalidatePath("/contabilidad");
  revalidatePath("/calendario");
  revalidatePath("/");
  return facturaId;
}

// Añade un cobro previsto al plan de pagos de la oportunidad. La vía decide
// la contabilidad: 'factura' (oficial, con IVA ya incluido en el importe) o
// 'efectivo' (vista de amigos, sin IVA). Sale en Tesorería y en el Calendario.
export async function crearCobroPrevisto(input: {
  oportunidadId: string;
  fecha: string;
  importe: number;
  via: string;
  concepto: string | null;
}) {
  const sb = createAdminClient();
  if (!input.fecha || !(input.importe > 0)) throw new Error("Falta fecha o importe.");
  const esEfectivo = input.via === "efectivo";
  const { error } = await sb.from("tesoreria").insert({
    concepto:
      input.concepto?.trim() ||
      (esEfectivo ? "Cobro previsto (efectivo, sin IVA)" : "Cobro previsto (con factura)"),
    tipo: "ingreso",
    naturaleza: esEfectivo ? "amigos" : "ingreso_factura",
    categoria: esEfectivo ? "Cobro en efectivo" : "Cobro factura",
    importe: input.importe,
    fecha: input.fecha,
    estado: "previsto",
    oportunidad_id: input.oportunidadId,
    computa_contabilidad: !esEfectivo,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/oportunidades/${input.oportunidadId}`);
  revalidatePath("/tesoreria");
  revalidatePath("/calendario");
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
      via: l.via ?? "factura",
    })),
    op.iva_pct,
    op.retencion_pct,
  );

  // Primero se dan por cobrados los ingresos previstos ya enlazados (p. ej.
  // el cobro previsto que dejó la factura), para no duplicar movimientos.
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  await sb
    .from("tesoreria")
    .update({ estado: "cobrado", fecha: hoy })
    .eq("oportunidad_id", oportunidadId)
    .eq("tipo", "ingreso")
    .eq("estado", "previsto");

  const { data: cobros } = await sb
    .from("tesoreria")
    .select("importe, naturaleza")
    .eq("oportunidad_id", oportunidadId)
    .eq("tipo", "ingreso")
    .eq("estado", "cobrado");
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const cobradoAmigos = (cobros ?? [])
    .filter((c) => c.naturaleza === "amigos")
    .reduce((s, c) => s + Number(c.importe), 0);
  const cobradoFactura = (cobros ?? [])
    .filter((c) => c.naturaleza !== "amigos")
    .reduce((s, c) => s + Number(c.importe), 0);

  // Operación de amigos pura: todo el presupuesto va a la vista amigos.
  const esAmigos = op.tipo_operacion === "amigos_prestamo";
  const objFactura = esAmigos ? 0 : t.totalFactura;
  const objEfectivo = esAmigos ? t.total : t.efectivo;

  const pendFactura = r2(objFactura - cobradoFactura);
  const pendEfectivo = r2(objEfectivo - cobradoAmigos);

  if (pendFactura > 0.01) {
    const { error: insErr } = await sb.from("tesoreria").insert({
      concepto: `Cobro final ${op.titulo}`,
      tipo: "ingreso",
      naturaleza: "ingreso_factura",
      categoria: "Cobro alquiler",
      importe: pendFactura,
      fecha: hoy,
      estado: "cobrado",
      oportunidad_id: oportunidadId,
      computa_contabilidad: true,
    });
    if (insErr) throw new Error(insErr.message);
  }
  if (pendEfectivo > 0.01) {
    const { error: insErr } = await sb.from("tesoreria").insert({
      concepto: esAmigos
        ? `Aportación amigos · ${op.titulo}`
        : `Parte en efectivo (sin IVA) · ${op.titulo}`,
      tipo: "ingreso",
      naturaleza: "amigos",
      categoria: esAmigos ? "Aportación amigos" : "Cobro en efectivo",
      importe: pendEfectivo,
      fecha: hoy,
      estado: "cobrado",
      oportunidad_id: oportunidadId,
      computa_contabilidad: false,
    });
    if (insErr) throw new Error(insErr.message);
  }

  await sb.from("facturas").update({ estado: "cobrada" }).eq("oportunidad_id", oportunidadId);

  revalidatePath("/");
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${oportunidadId}`);
  revalidatePath("/facturas");
  revalidatePath("/tesoreria");
  revalidatePath("/contabilidad");
}
