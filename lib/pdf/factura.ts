import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { FacturaPDFDoc, type FacturaPdfData } from "./FacturaPDF";
import { EMPRESA } from "@/lib/empresa";
import { eur, fecha, num } from "@/lib/format";
import { CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { Factura, FacturaLinea } from "@/lib/types";

// Prepara los datos de la factura para el PDF (importes ya formateados) y
// devuelve el Buffer del PDF. No toca red ni base de datos.
export async function renderFacturaPdf(f: Factura): Promise<Buffer> {
  const base = Number(f.base_imponible);
  const iva = Number(f.iva);
  const ret = Number(f.retencion);
  const ivaPct = base > 0 ? Math.round((iva / base) * 100) : 0;
  const retPct = base > 0 ? Math.round((ret / base) * 100) : 0;

  // Líneas: foto fija de la factura; si no las tiene, las del presupuesto; si
  // tampoco, una línea única con la base. Solo vía factura (efectivo es interno).
  let todas: FacturaLinea[] = Array.isArray(f.lineas) ? f.lineas : [];
  if (todas.length === 0 && f.oportunidad?.presupuesto_lineas?.length) {
    todas = f.oportunidad.presupuesto_lineas
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((l) => ({
        concepto: l.concepto,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        bloque: l.bloque ?? null,
        via: l.via ?? "factura",
        descuento_pct: l.descuento_pct ?? null,
      }));
  }
  let lineas = todas.filter((l) => (l.via ?? "factura") !== "efectivo");
  if (lineas.length === 0) {
    lineas = [
      {
        concepto: f.oportunidad ? `Servicios de decoración · ${f.oportunidad.titulo}` : "Servicios de decoración",
        cantidad: 1,
        precio_unitario: base,
        bloque: null,
      },
    ];
  }

  const bruto = (l: FacturaLinea) => l.cantidad * l.precio_unitario;
  const neto = (l: FacturaLinea) => bruto(l) * (1 - (l.descuento_pct ?? 0) / 100);
  const hayDto = lineas.some((l) => (l.descuento_pct ?? 0) > 0);
  // Descuento total (líneas + global congelado) frente a la base facturada.
  const sumaNeta = lineas.reduce((sm, l) => sm + neto(l), 0);
  const descTotal = Math.max(0, sumaNeta - base);
  const incluyeDescuento = descTotal > 0.5 ? `Incluye un descuento de ${eur(descTotal)}.` : null;

  const cli = f.cliente;
  const data: FacturaPdfData = {
    numero: f.numero,
    fecha: fecha(f.fecha_emision),
    anulada: f.estado === "anulada",
    emisor: {
      nombre: EMPRESA.nombre,
      razon: EMPRESA.razon_social || "",
      nif: EMPRESA.nif || "",
      direccion: EMPRESA.direccion || "",
      contacto: [EMPRESA.email, EMPRESA.telefono].filter(Boolean).join(" · "),
      web: EMPRESA.web || "",
      iban: EMPRESA.iban || "",
      titular: EMPRESA.titular_cuenta || "",
    },
    cliente: {
      nombre: cli?.nombre ?? "—",
      docLabel: cli?.tipo === "empresa" ? "CIF" : "NIF",
      doc: cli?.nif_cif ?? "",
      direccion: [cli?.direccion, cli?.localidad].filter(Boolean).join(", "),
    },
    hayDto,
    lineas: lineas.map((l) => ({
      concepto: l.concepto,
      cantidad: num(l.cantidad, l.cantidad % 1 === 0 ? 0 : 2),
      precio: eur(l.precio_unitario),
      dto: (l.descuento_pct ?? 0) > 0 ? `${num(l.descuento_pct ?? 0, 0)}%` : "—",
      importe: eur(neto(l)),
    })),
    base: eur(base),
    ivaPct,
    iva: eur(iva),
    retPct,
    ret: eur(ret),
    total: eur(Number(f.total)),
    incluyeDescuento,
  };
  void CLIENTE_TIPO_LABEL; // reservado por si se etiqueta el tipo de cliente
  const element = React.createElement(FacturaPDFDoc, { data });
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}
