import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { LOGO_TDO } from "./logo";
import { MARCELLUS_400, MONTSERRAT_400, MONTSERRAT_600, MONTSERRAT_700 } from "./fonts";

// Tipografía de marca: Marcellus (titulares) + Montserrat (cuerpo).
Font.register({ family: "Marcellus", src: MARCELLUS_400 });
Font.register({
  family: "Montserrat",
  fonts: [
    { src: MONTSERRAT_400, fontWeight: 400 },
    { src: MONTSERRAT_600, fontWeight: 600 },
    { src: MONTSERRAT_700, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]); // sin cortes de palabra raros

// Datos ya preparados (importes formateados) para que el componente sea "tonto".
export type FacturaPdfData = {
  numero: string;
  fecha: string;
  vencimiento: string | null;
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
  notas: string | null;
  condicionesPago: string | null; // "Pago a 30 días" / "Pago al momento"
};

const COL = {
  sage: "#3F4A36",
  sageSoft: "#5C6A4E",
  clay: "#BE6E4C",
  beige: "#FBF7EF",
  beigeWarm: "#F2ECDE",
  cream: "#FBF7EF",
  ink: "#2B2A24",
  soft: "#726C5B",
  line: "#E6DECB",
};

const s = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 58, paddingHorizontal: 48, fontSize: 9, color: COL.ink, fontFamily: "Montserrat", lineHeight: 1.5 },
  ribbon: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COL.sage },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logoWrap: { width: 250 },
  logo: { width: 176, height: 98, objectFit: "contain" },
  emisor: { marginTop: 8, fontSize: 8, color: COL.soft, lineHeight: 1.55 },
  emisorNom: { fontWeight: 700, color: COL.ink, fontSize: 9.5 },
  titWrap: { alignItems: "flex-end" },
  titulo: { fontSize: 34, fontFamily: "Marcellus", color: COL.sage, letterSpacing: 4, lineHeight: 1 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  metaK: { fontSize: 7.5, color: COL.soft, textAlign: "right", width: 62, paddingRight: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  metaV: { fontSize: 9.5, textAlign: "right", fontWeight: 600 },
  rule: { height: 1.5, backgroundColor: COL.sage, marginTop: 16, marginBottom: 18 },

  clienteWrap: { marginBottom: 18 },
  label: { fontSize: 7.5, letterSpacing: 1.5, color: COL.clay, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 },
  clienteNom: { fontWeight: 700, fontSize: 11.5 },

  th: { flexDirection: "row", backgroundColor: COL.sage, color: COL.cream, paddingVertical: 6, paddingHorizontal: 9, fontSize: 7.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 },
  td: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 9, borderBottomWidth: 0.6, borderBottomColor: COL.line },
  tdAlt: { backgroundColor: "#FCFAF4" },
  cConcepto: { flex: 1, paddingRight: 6 },
  cNum: { width: 36, textAlign: "right" },
  cPrecio: { width: 76, textAlign: "right" },
  cImporte: { width: 78, textAlign: "right" },
  strong: { fontWeight: 700 },

  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totals: { width: 258 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5, paddingHorizontal: 10 },
  totK: { color: COL.soft },
  totV: { fontWeight: 600 },
  totalBar: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COL.sage, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12, marginTop: 5 },
  totalBarK: { color: COL.cream, fontFamily: "Marcellus", fontSize: 12, letterSpacing: 1 },
  totalBarV: { color: COL.cream, fontWeight: 700, fontSize: 12.5 },
  descNote: { marginTop: 8, fontSize: 8.5, color: COL.clay, textAlign: "right", fontWeight: 600 },

  pago: { marginTop: 16, backgroundColor: COL.beigeWarm, borderRadius: 4, padding: 13 },
  pagoT: { fontSize: 8.5, color: COL.soft, marginTop: 3 },
  notas: { marginTop: 12, fontSize: 8.5, color: COL.soft },

  foot: { position: "absolute", bottom: 26, left: 48, right: 48, textAlign: "center", fontSize: 7.5, color: COL.soft, borderTopWidth: 0.6, borderTopColor: COL.line, paddingTop: 7 },
  anulada: { position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontSize: 96, color: "#E7413118", fontFamily: "Marcellus", transform: "rotate(-22deg)" },
});

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV}>{v}</Text>
    </View>
  );
}

export function FacturaPDFDoc({ data }: { data: FacturaPdfData }) {
  const e = data.emisor;
  return (
    <Document title={`Factura ${data.numero}`} author={e.nombre}>
      <Page size="A4" style={s.page}>
        <View style={s.ribbon} fixed />
        {data.anulada && <Text style={s.anulada}>ANULADA</Text>}

        {/* Cabecera: logo + datos fiscales a la izquierda, título a la derecha */}
        <View style={s.header}>
          <View style={s.logoWrap}>
            <Image style={s.logo} src={LOGO_TDO} />
            <View style={s.emisor}>
              <Text style={s.emisorNom}>{e.nombre}</Text>
              {!!e.razon && <Text>{e.razon}</Text>}
              {!!e.nif && <Text>NIF: {e.nif}</Text>}
              <Text>{e.direccion}</Text>
              <Text>{e.contacto}</Text>
              {!!e.web && <Text>{e.web}</Text>}
            </View>
          </View>
          <View style={s.titWrap}>
            <Text style={s.titulo}>FACTURA</Text>
            <Meta k="Nº" v={data.numero} />
            <Meta k="Fecha" v={data.fecha} />
            {!!data.vencimiento && <Meta k="Vence" v={data.vencimiento} />}
          </View>
        </View>

        <View style={s.rule} />

        {/* Cliente */}
        <View style={s.clienteWrap}>
          <Text style={s.label}>Facturar a</Text>
          <Text style={s.clienteNom}>{data.cliente.nombre}</Text>
          {!!data.cliente.doc && <Text>{data.cliente.docLabel}: {data.cliente.doc}</Text>}
          {!!data.cliente.direccion && <Text>{data.cliente.direccion}</Text>}
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
          <View style={[s.td, ...(i % 2 ? [s.tdAlt] : [])]} key={i}>
            <Text style={s.cConcepto}>{l.concepto}</Text>
            <Text style={s.cNum}>{l.cantidad}</Text>
            <Text style={s.cPrecio}>{l.precio}</Text>
            {data.hayDto && <Text style={s.cNum}>{l.dto}</Text>}
            <Text style={s.cImporte}>{l.importe}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totals}>
            <View style={s.totRow}>
              <Text style={s.totK}>Base imponible</Text>
              <Text style={s.totV}>{data.base}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totK}>IVA ({data.ivaPct}%)</Text>
              <Text style={s.totV}>{data.iva}</Text>
            </View>
            {data.retPct > 0 && (
              <View style={s.totRow}>
                <Text style={s.totK}>Retención IRPF ({data.retPct}%)</Text>
                <Text style={s.totV}>-{data.ret}</Text>
              </View>
            )}
            <View style={s.totalBar}>
              <Text style={s.totalBarK}>TOTAL</Text>
              <Text style={s.totalBarV}>{data.total}</Text>
            </View>
          </View>
        </View>
        {!!data.incluyeDescuento && <Text style={s.descNote}>{data.incluyeDescuento}</Text>}

        {/* Forma de pago */}
        <View style={s.pago} wrap={false}>
          <Text style={s.strong}>Forma de pago · transferencia bancaria</Text>
          {!!data.condicionesPago && (
            <Text style={s.pagoT}>
              Condiciones: {data.condicionesPago}
              {data.vencimiento ? `   ·   Vencimiento: ${data.vencimiento}` : ""}
            </Text>
          )}
          {!!e.iban && <Text style={s.pagoT}>IBAN: {e.iban}{e.titular ? `   ·   Titular: ${e.titular}` : ""}</Text>}
          <Text style={s.pagoT}>Indica el nº de factura ({data.numero}) en el concepto y envía el justificante a {e.contacto.split(" · ")[0] || e.web}.</Text>
        </View>

        {!!data.notas && <Text style={s.notas}>{data.notas}</Text>}

        <Text style={s.foot} fixed>
          {[e.nombre, e.web, e.contacto].filter(Boolean).join("   ·   ")}
        </Text>
      </Page>
    </Document>
  );
}
