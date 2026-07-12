import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_TDO } from "./logo";

// Datos ya preparados (importes formateados) para que el componente sea "tonto".
export type FacturaPdfData = {
  numero: string;
  fecha: string;
  anulada: boolean;
  emisor: {
    nombre: string;
    razon: string;
    nif: string;
    direccion: string;
    contacto: string;
    web: string;
    iban: string;
    titular: string;
  };
  cliente: { nombre: string; docLabel: string; doc: string; direccion: string };
  hayDto: boolean;
  lineas: { concepto: string; cantidad: string; precio: string; dto: string; importe: string }[];
  base: string;
  ivaPct: number;
  iva: string;
  retPct: number;
  ret: string;
  total: string;
  incluyeDescuento: string | null;
};

const COL = {
  sage: "#3F4A36",
  clay: "#BE6E4C",
  beige: "#FBF7EF",
  beigeWarm: "#F1EBDD",
  ink: "#2B2A24",
  soft: "#6F6A59",
  line: "#E4DCC9",
};

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 46, fontSize: 9.5, color: COL.ink, fontFamily: "Helvetica", lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  titulo: { fontSize: 24, fontFamily: "Helvetica-Bold", color: COL.sage, letterSpacing: 1.5, lineHeight: 1 },
  sub: { fontSize: 9.5, color: COL.soft, marginTop: 5 },
  logo: { width: 168, height: 92, objectFit: "contain" },
  rule: { height: 2, backgroundColor: COL.sage, marginBottom: 14, marginTop: 2 },
  row: { flexDirection: "row" },
  cols2: { flexDirection: "row", gap: 14, marginBottom: 16 },
  box: { flex: 1, backgroundColor: COL.beige, borderWidth: 0.7, borderColor: COL.line, borderRadius: 4, padding: 11 },
  label: { fontSize: 7.5, letterSpacing: 1, color: COL.clay, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", backgroundColor: COL.sage, color: COL.beige, paddingVertical: 5, paddingHorizontal: 8, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  td: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: COL.line },
  cConcepto: { flex: 1, paddingRight: 6 },
  cNum: { width: 36, textAlign: "right" },
  cPrecio: { width: 74, textAlign: "right" },
  cImporte: { width: 74, textAlign: "right" },
  totRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  totLabel: { width: 120, textAlign: "right", color: COL.soft, paddingRight: 10, paddingVertical: 2 },
  totVal: { width: 80, textAlign: "right", paddingVertical: 2 },
  totalFinal: { backgroundColor: COL.beigeWarm, borderRadius: 4 },
  pago: { marginTop: 22, borderTopWidth: 0.7, borderTopColor: COL.line, paddingTop: 10, fontSize: 8.5, color: COL.soft },
  foot: { position: "absolute", bottom: 24, left: 46, right: 46, textAlign: "center", fontSize: 7.5, color: COL.soft, borderTopWidth: 0.6, borderTopColor: COL.line, paddingTop: 6 },
  anulada: { position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontSize: 90, color: "#E7413122", fontFamily: "Helvetica-Bold", transform: "rotate(-20deg)" },
});

export function FacturaPDFDoc({ data }: { data: FacturaPdfData }) {
  const e = data.emisor;
  return (
    <Document title={`Factura ${data.numero}`} author={e.nombre}>
      <Page size="A4" style={s.page}>
        {data.anulada && <Text style={s.anulada}>ANULADA</Text>}

        {/* Cabecera: título a la izquierda, logo a la derecha */}
        <View style={s.header}>
          <View>
            <Text style={s.titulo}>FACTURA</Text>
            <Text style={s.sub}>Nº {data.numero}   ·   Fecha: {data.fecha}</Text>
          </View>
          <Image style={s.logo} src={LOGO_TDO} />
        </View>
        <View style={s.rule} />

        {/* Emisor y cliente, en dos cajas */}
        <View style={s.cols2}>
          <View style={s.box}>
            <Text style={s.label}>Emisor</Text>
            <Text style={s.strong}>{e.nombre}</Text>
            {!!e.razon && <Text>{e.razon}</Text>}
            {!!e.nif && <Text>NIF: {e.nif}</Text>}
            <Text>{e.direccion}</Text>
            <Text>{e.contacto}</Text>
            {!!e.web && <Text>{e.web}</Text>}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Cliente</Text>
            <Text style={s.strong}>{data.cliente.nombre}</Text>
            {!!data.cliente.doc && <Text>{data.cliente.docLabel}: {data.cliente.doc}</Text>}
            {!!data.cliente.direccion && <Text>{data.cliente.direccion}</Text>}
          </View>
        </View>

        {/* Líneas */}
        <View style={s.th}>
          <Text style={s.cConcepto}>Descripción</Text>
          <Text style={s.cNum}>Cant.</Text>
          <Text style={s.cPrecio}>Precio</Text>
          {data.hayDto && <Text style={s.cNum}>Dto</Text>}
          <Text style={s.cImporte}>Importe</Text>
        </View>
        {data.lineas.map((l, i) => (
          <View style={s.td} key={i}>
            <Text style={s.cConcepto}>{l.concepto}</Text>
            <Text style={s.cNum}>{l.cantidad}</Text>
            <Text style={s.cPrecio}>{l.precio}</Text>
            {data.hayDto && <Text style={s.cNum}>{l.dto}</Text>}
            <Text style={s.cImporte}>{l.importe}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={{ marginTop: 10 }}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Base imponible</Text>
            <Text style={s.totVal}>{data.base}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>IVA {data.ivaPct}%</Text>
            <Text style={s.totVal}>{data.iva}</Text>
          </View>
          {data.retPct > 0 && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>Retención {data.retPct}%</Text>
              <Text style={s.totVal}>-{data.ret}</Text>
            </View>
          )}
          <View style={[s.totRow, s.totalFinal]}>
            <Text style={[s.totLabel, s.strong, { color: COL.ink }]}>TOTAL</Text>
            <Text style={[s.totVal, s.strong]}>{data.total}</Text>
          </View>
        </View>

        {!!data.incluyeDescuento && (
          <Text style={{ marginTop: 8, fontSize: 8.5, color: COL.clay }}>{data.incluyeDescuento}</Text>
        )}

        {/* Forma de pago */}
        <View style={s.pago}>
          <Text style={s.strong}>Forma de pago: transferencia bancaria</Text>
          {!!e.iban && <Text>IBAN: {e.iban}{e.titular ? `  ·  Titular: ${e.titular}` : ""}</Text>}
        </View>

        <Text style={s.foot} fixed>
          {[e.web, e.contacto].filter(Boolean).join("  –  ")}
        </Text>
      </Page>
    </Document>
  );
}
