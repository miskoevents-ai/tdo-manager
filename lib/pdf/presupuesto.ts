import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PresupuestoPDFDoc, type PresuPdfData } from "./PresupuestoPDF";
import { EMPRESA, condicionesPara, PORTADA_CANDIDATAS, PORTADA_RESPALDO } from "@/lib/empresa";
import { portadaUrl } from "@/lib/catalogo";
import { calcularTotales, resumenModalidades } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";
import { TIPO_EVENTO_LABEL, CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { Oportunidad, PresupuestoLinea } from "@/lib/types";

// Descarga una imagen y la devuelve como data URI (para incrustarla en el PDF).
// Si falla (URL muerta, no imagen…), devuelve null: el PDF se genera igual sin
// esa foto, nunca se rompe.
async function comoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${process.env.APP_URL || "https://tdo-manager.vercel.app"}${url}`;
    const r = await fetch(abs);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 6 * 1024 * 1024) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Genera el PDF del presupuesto (mismo diseño que la pantalla) y devuelve el
// Buffer. `version` es una versión guardada (V1, V2…) o null para el vivo.
type LineaLike = {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  bloque?: string | null;
  via?: "factura" | "efectivo" | null;
  descuento_pct?: number | null;
  foto?: string | null;
  orden?: number;
};

export async function renderPresupuestoPdf(
  op: Oportunidad,
  version: { version: number; created_at: string; lineas: LineaLike[]; iva_pct: number; retencion_pct: number; descuento_pct?: number | null } | null,
): Promise<{ buffer: Buffer; numero: string }> {
  const lineas: PresupuestoLinea[] = version
    ? version.lineas.map((l, i) => ({
        id: String(i),
        oportunidad_id: op.id,
        orden: l.orden ?? i,
        concepto: l.concepto,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        bloque: l.bloque ?? null,
        via: l.via ?? "factura",
        descuento_pct: l.descuento_pct ?? null,
        foto: l.foto ?? null,
      }))
    : op.presupuesto_lineas ?? [];
  const ivaPct = version ? Number(version.iva_pct) : op.iva_pct;
  const retPct = version ? Number(version.retencion_pct) : op.retencion_pct;
  const dtoPct = version ? Number(version.descuento_pct ?? 0) : op.descuento_pct ?? 0;
  const t = calcularTotales(lineas, ivaPct, retPct, dtoPct);
  const cli = op.cliente;
  const esAlquiler = op.serie === "alquiler_encargo";
  const esAmigos = op.tipo_operacion === "amigos_prestamo";

  // Modalidades (opciones excluyentes) o, si no hay, bloques — igual que la
  // pantalla. Cada grupo lleva su etiqueta y su subtotal (base de sus líneas).
  const resumen = resumenModalidades(lineas, ivaPct, retPct, dtoPct);
  const hayModalidades = resumen.hay;
  type GrupoPdf = { nombre: string | null; etiqueta: string | null; comun?: boolean; lineas: PresupuestoLinea[] };
  const grupos: GrupoPdf[] = [];
  if (hayModalidades) {
    const comunes = lineas.filter((l) => !(l.modalidad ?? "").trim());
    if (comunes.length) grupos.push({ nombre: null, etiqueta: "Incluido en todas las opciones", comun: true, lineas: comunes });
    for (const o of resumen.opciones) {
      const suyas = lineas.filter((l) => (l.modalidad ?? "").trim() === o.nombre);
      grupos.push({ nombre: o.nombre, etiqueta: `Opción · ${o.nombre}`, lineas: suyas });
    }
  } else {
    for (const l of lineas) {
      const nombre = l.bloque ?? null;
      const g = grupos.find((x) => x.nombre === nombre);
      if (g) g.lineas.push(l);
      else grupos.push({ nombre, etiqueta: nombre, lineas: [l] });
    }
  }
  const hayBloques = !hayModalidades && grupos.some((g) => g.nombre);
  const hayDto = lineas.some((l) => (l.descuento_pct ?? 0) > 0);
  const bruto = (l: PresupuestoLinea) => l.cantidad * l.precio_unitario;
  const neto = (l: PresupuestoLinea) => bruto(l) * (1 - (l.descuento_pct ?? 0) / 100);
  const brutoSinDto = lineas.reduce((sm, l) => sm + bruto(l), 0);
  const descuentoTotal = Math.max(0, brutoSinDto - t.base);

  // Portada: primera candidata que exista + fotos de línea → data URIs.
  const portadaCand = [...PORTADA_CANDIDATAS.map((c) => portadaUrl(c)).filter((u): u is string => Boolean(u)), PORTADA_RESPALDO];
  let portada: string | null = null;
  for (const u of portadaCand) {
    portada = await comoDataUri(u);
    if (portada) break;
  }
  // Fotos de línea en paralelo.
  const fotos = await Promise.all(grupos.flatMap((g) => g.lineas).map((l) => comoDataUri(portadaUrl(l.foto ?? null))));
  let idx = 0;

  const totales: PresuPdfData["totales"] = [];
  if (descuentoTotal > 0) {
    totales.push({ label: "Subtotal (sin descuento)", value: eur(brutoSinDto) });
    totales.push({ label: `Descuento${dtoPct > 0 ? ` (incl. −${num(dtoPct, 0)}% global)` : ""}`, value: `−${eur(descuentoTotal)}`, clay: true });
  }
  totales.push({ label: "Base imponible", value: eur(esAmigos ? t.base : t.baseFactura) });
  totales.push({ label: `IVA (${ivaPct}%)`, value: eur(t.iva) });
  if (t.retencion > 0) totales.push({ label: `Retención IRPF (−${retPct}%)`, value: `−${eur(t.retencion)}` });
  if (!esAmigos && t.efectivo > 0) {
    totales.push({ label: "Total con factura", value: eur(t.totalFactura) });
    totales.push({ label: "Conceptos sin IVA", value: eur(t.efectivo) });
  }

  const data: PresuPdfData = {
    docLabel: esAmigos ? "NOTA (AMIGOS)" : "PRESUPUESTO",
    numero: op.numero,
    version: version ? version.version : null,
    fecha: fecha(version ? version.created_at : op.fecha_entrada ?? op.created_at),
    eventoLabel: op.fecha_evento ? `${esAlquiler ? "Alquiler" : "Evento"}: ${fecha(op.fecha_evento)}` : null,
    emisor: {
      nombre: EMPRESA.nombre,
      razon: EMPRESA.razon_social || "",
      nif: EMPRESA.nif || "",
      direccion: EMPRESA.direccion || "",
      tel: EMPRESA.telefono || "",
      email: EMPRESA.email || "",
      web: EMPRESA.web || "",
    },
    portada,
    cliente: {
      nombre: cli?.nombre ?? "—",
      tipo: cli?.tipo ? CLIENTE_TIPO_LABEL[cli.tipo] ?? cli.tipo : "",
      nif: cli?.nif_cif ? `NIF ${cli.nif_cif}` : "",
      extra: [cli?.direccion, cli?.localidad, cli?.email, cli?.telefono].filter((x): x is string => Boolean(x)),
    },
    detalle: {
      titulo: op.titulo,
      tipo: TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento,
      extra: [op.lugar?.nombre ? `Lugar: ${op.lugar.nombre}` : null, op.n_invitados != null ? `Invitados: ${op.n_invitados}` : null].filter(
        (x): x is string => Boolean(x),
      ),
    },
    hayDto,
    hayBloques,
    hayModalidades,
    opciones: resumen.opciones.map((o) => ({ nombre: o.nombre, total: eur(o.total) })),
    grupos: grupos.map((g) => ({
      nombre: g.nombre,
      etiqueta: g.etiqueta,
      subtotal: hayModalidades ? eur(g.lineas.reduce((s, l) => s + neto(l), 0)) : null,
      lineas: g.lineas.map((l) => ({
        foto: fotos[idx++] ?? null,
        concepto: l.concepto,
        sinIva: !esAmigos && l.via === "efectivo",
        cantidad: num(l.cantidad, l.cantidad % 1 === 0 ? 0 : 2),
        precio: eur(l.precio_unitario),
        dto: (l.descuento_pct ?? 0) > 0 ? `${num(l.descuento_pct ?? 0, 0)}%` : "—",
        subtotal: eur(neto(l)),
      })),
    })),
    totales,
    total: eur(t.total),
    descuentoNota: descuentoTotal > 0 ? `Incluye un descuento de ${eur(descuentoTotal)}` : null,
    fianza: (op.fianza ?? 0) > 0 ? eur(op.fianza ?? 0) : null,
    condiciones: condicionesPara(op.serie),
    pago: EMPRESA.iban || EMPRESA.titular_cuenta ? [EMPRESA.titular_cuenta, EMPRESA.iban].filter(Boolean).join(" · ") : null,
    gracias: `¡Gracias por confiar en ${EMPRESA.nombre}!`,
  };

  const element = React.createElement(PresupuestoPDFDoc, { data });
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  return { buffer, numero: op.numero };
}
