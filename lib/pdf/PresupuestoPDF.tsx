import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { LOGO_TDO } from "./logo";
import { MARCELLUS_400, MONTSERRAT_400, MONTSERRAT_600, MONTSERRAT_700 } from "./fonts";

Font.register({ family: "Marcellus", src: MARCELLUS_400 });
Font.register({
  family: "Montserrat",
  fonts: [
    { src: MONTSERRAT_400, fontWeight: 400 },
    { src: MONTSERRAT_600, fontWeight: 600 },
    { src: MONTSERRAT_700, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

export type PresuPdfData = {
  docLabel: string;
  numero: string;
  version: number | null;
  fecha: string;
  eventoLabel: string | null;
  emisor: { nombre: string; razon: string; nif: string; direccion: string; tel: string; email: string; web: string };
  portada: string | null; // data URI o null
  cliente: { nombre: string; tipo: string; nif: string; extra: string[] };
  detalle: { titulo: string; tipo: string; extra: string[] };
  hayDto: boolean;
  hayBloques: boolean;
  hayModalidades: boolean;
  opciones: { nombre: string; total: string }[];
  grupos: {
    nombre: string | null;
    etiqueta: string | null;
    subtotal: string | null;
    lineas: { foto: string | null; concepto: string; sinIva: boolean; cantidad: string; precio: string; dto: string; subtotal: string }[];
  }[];
  totales: { label: string; value: string; fuerte?: boolean; clay?: boolean }[];
  total: string;
  descuentoNota: string | null;
  fianza: string | null;
  condiciones: string[];
  condicionesGenerales: { titulo: string; texto: string }[];
  notaAceptacion: string;
  pago: string | null;
  gracias: string;
};

const COL = {
  sage: "#3F4A36",
  clay: "#BE6E4C",
  beigeWarm: "#F2ECDE",
  cream: "#FBF7EF",
  ink: "#2B2A24",
  soft: "#726C5B",
  muted: "#9A9484",
  line: "#E6DECB",
  hair: "#F0EAE1",
};

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 54, paddingHorizontal: 44, fontSize: 9, color: COL.ink, fontFamily: "Montserrat", lineHeight: 1.5 },
  ribbon: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: COL.sage },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1.5, borderBottomColor: COL.sage, paddingBottom: 14 },
  logo: { width: 170, height: 92, objectFit: "contain" },
  emisor: { marginTop: 6, fontSize: 8, color: COL.soft, lineHeight: 1.5 },
  titWrap: { alignItems: "flex-end" },
  titulo: { fontSize: 26, fontFamily: "Marcellus", color: COL.sage, letterSpacing: 2, lineHeight: 1 },
  metaLine: { fontSize: 9, color: COL.soft, marginTop: 3, textAlign: "right" },
  metaB: { fontWeight: 700, color: COL.ink },

  portada: { marginTop: 16, width: "100%", height: 200, objectFit: "cover", borderRadius: 4 },

  colsWrap: { flexDirection: "row", gap: 24, marginTop: 16 },
  col: { flex: 1 },
  label: { fontSize: 7.5, letterSpacing: 1.2, color: COL.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 },
  nom: { fontWeight: 700, fontSize: 11 },
  soft: { color: COL.soft },

  th: { flexDirection: "row", backgroundColor: COL.beigeWarm, paddingVertical: 6, paddingHorizontal: 8, fontSize: 7.5, fontWeight: 700, color: COL.soft, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 18 },
  bloque: { fontSize: 8, fontWeight: 700, color: COL.clay, textTransform: "uppercase", letterSpacing: 1, paddingTop: 10, paddingBottom: 3, paddingHorizontal: 8 },
  subGrupo: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COL.beigeWarm, paddingVertical: 4, paddingHorizontal: 8, marginTop: 2 },
  subGrupoK: { fontSize: 8, color: COL.soft },
  subGrupoV: { fontSize: 9, fontWeight: 700, color: COL.ink },
  opcionBar: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: COL.sage, marginTop: 5, paddingTop: 6 },
  opcionK: { color: COL.sage, fontFamily: "Marcellus", fontSize: 13 },
  opcionV: { color: COL.sage, fontFamily: "Marcellus", fontSize: 13 },
  opcionNota: { fontSize: 7.5, color: COL.muted, marginTop: 4, lineHeight: 1.4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: COL.hair },
  cConcepto: { flex: 1, flexDirection: "row", alignItems: "center", paddingRight: 6 },
  // El texto necesita flex:1 para AJUSTARSE a su columna: sin él, un concepto
  // largo se desborda por encima de la columna de cantidad (parecía "tachar"
  // el 1). La foto lleva marginRight en vez de gap (más compatible).
  cTexto: { flex: 1 },
  foto: { width: 54, height: 54, objectFit: "cover", borderRadius: 4, marginRight: 8 },
  cNum: { width: 34, textAlign: "right" },
  cPrecio: { width: 66, textAlign: "right" },
  cSub: { width: 70, textAlign: "right", fontWeight: 600 },
  sinIva: { fontSize: 7.5, color: COL.muted },

  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totals: { width: 250 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totK: { color: COL.soft },
  totV: { fontWeight: 600 },
  totalBar: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: COL.sage, marginTop: 5, paddingTop: 6 },
  totalBarK: { color: COL.sage, fontFamily: "Marcellus", fontSize: 15 },
  totalBarV: { color: COL.sage, fontFamily: "Marcellus", fontSize: 15 },
  clay: { color: COL.clay },
  fianza: { flexDirection: "row", justifyContent: "space-between", marginTop: 3, color: COL.clay, fontSize: 9 },

  cond: { marginTop: 22, borderTopWidth: 0.6, borderTopColor: COL.line, paddingTop: 12, fontSize: 8.5, color: COL.soft, lineHeight: 1.5 },
  condItem: { flexDirection: "row", gap: 5, marginBottom: 1.5 },
  pago: { marginTop: 8, fontSize: 8.5 },
  acepta: { marginTop: 10, fontSize: 8.5, color: COL.clay, fontWeight: 600 },
  gracias: { marginTop: 14, textAlign: "center", fontFamily: "Marcellus", fontSize: 12, color: COL.sage },

  // Página de condiciones generales
  cgTitulo: { fontFamily: "Marcellus", fontSize: 15, color: COL.sage, marginBottom: 3 },
  cgSub: { fontSize: 8.5, color: COL.muted, marginBottom: 14 },
  cgItem: { flexDirection: "row", gap: 6, marginBottom: 7 },
  cgNum: { width: 14, fontSize: 8.5, fontWeight: 700, color: COL.clay },
  cgCuerpo: { flex: 1, fontSize: 8.5, color: COL.ink, lineHeight: 1.45 },
  cgClausulaK: { fontWeight: 700, color: COL.sage },
  cgPie: { marginTop: 16, fontSize: 8, color: COL.muted, textAlign: "center" },
});

export function PresupuestoPDFDoc({ data }: { data: PresuPdfData }) {
  const e = data.emisor;
  return (
    <Document title={`${data.docLabel} ${data.numero}`} author={e.nombre}>
      <Page size="A4" style={s.page}>
        <View style={s.ribbon} fixed />

        {/* Cabecera */}
        <View style={s.header}>
          <View style={{ width: 250 }}>
            <Image style={s.logo} src={LOGO_TDO} />
            <View style={s.emisor}>
              {!!e.razon && <Text>{e.razon}</Text>}
              {!!e.nif && <Text>NIF: {e.nif}</Text>}
              {!!e.direccion && <Text>{e.direccion}</Text>}
              {!!e.tel && <Text>Tel. {e.tel}</Text>}
              {!!e.email && <Text>{e.email}</Text>}
              {!!e.web && <Text>{e.web}</Text>}
            </View>
          </View>
          <View style={s.titWrap}>
            <Text style={s.titulo}>{data.docLabel}</Text>
            <Text style={s.metaLine}>
              Nº <Text style={s.metaB}>{data.numero}</Text>
              {data.version != null ? ` · V${data.version}` : ""}
            </Text>
            <Text style={s.metaLine}>Fecha: {data.fecha}</Text>
            {!!data.eventoLabel && <Text style={s.metaLine}>{data.eventoLabel}</Text>}
          </View>
        </View>

        {/* Portada */}
        {data.portada && <Image style={s.portada} src={data.portada} />}

        {/* Cliente + Detalle */}
        <View style={s.colsWrap}>
          <View style={s.col}>
            <Text style={s.label}>Cliente</Text>
            <Text style={s.nom}>{data.cliente.nombre}</Text>
            <Text style={s.soft}>{[data.cliente.tipo, data.cliente.nif].filter(Boolean).join(" · ")}</Text>
            {data.cliente.extra.map((x, i) => (
              <Text key={i} style={s.soft}>{x}</Text>
            ))}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Detalle</Text>
            <Text style={s.nom}>{data.detalle.titulo}</Text>
            <Text style={s.soft}>{data.detalle.tipo}</Text>
            {data.detalle.extra.map((x, i) => (
              <Text key={i} style={s.soft}>{x}</Text>
            ))}
          </View>
        </View>

        {/* Cabecera de tabla */}
        <View style={s.th}>
          <Text style={{ flex: 1 }}>Concepto</Text>
          <Text style={s.cNum}>Cant.</Text>
          <Text style={s.cPrecio}>Precio</Text>
          {data.hayDto && <Text style={s.cNum}>Dto.</Text>}
          <Text style={s.cSub}>Subtotal</Text>
        </View>

        {/* Líneas */}
        {data.grupos.map((g, gi) => (
          <View key={gi}>
            {(data.hayBloques || data.hayModalidades) && (
              <Text style={s.bloque}>
                {data.hayModalidades
                  ? g.etiqueta ?? "Otros conceptos"
                  : g.nombre
                    ? `Bloque ${gi + 1} · ${g.nombre}`
                    : "Otros conceptos"}
              </Text>
            )}
            {g.lineas.map((l, li) => (
              <View style={s.row} key={li} wrap={false}>
                <View style={s.cConcepto}>
                  {l.foto && <Image style={s.foto} src={l.foto} />}
                  <Text style={s.cTexto}>
                    {l.concepto}
                    {l.sinIva ? <Text style={s.sinIva}>  (sin IVA)</Text> : null}
                  </Text>
                </View>
                <Text style={s.cNum}>{l.cantidad}</Text>
                <Text style={s.cPrecio}>{l.precio}</Text>
                {data.hayDto && <Text style={s.cNum}>{l.dto}</Text>}
                <Text style={s.cSub}>{l.subtotal}</Text>
              </View>
            ))}
            {data.hayModalidades && g.subtotal && (
              <View style={s.subGrupo} wrap={false}>
                <Text style={s.subGrupoK}>Subtotal {g.etiqueta}</Text>
                <Text style={s.subGrupoV}>{g.subtotal}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Totales */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totals}>
            {data.hayModalidades ? (
              <>
                <Text style={[s.totK, { fontWeight: 700, textTransform: "uppercase", fontSize: 7.5, letterSpacing: 0.6 }]}>
                  Elige una opción
                </Text>
                {data.opciones.map((o, i) => (
                  <View style={s.opcionBar} key={i}>
                    <Text style={s.opcionK}>{o.nombre}</Text>
                    <Text style={s.opcionV}>{o.total}</Text>
                  </View>
                ))}
                <Text style={s.opcionNota}>Cada opción incluye lo común. Precios con impuestos aplicados.</Text>
              </>
            ) : (
              <>
                {data.totales.map((t, i) => (
                  <View style={s.totRow} key={i}>
                    <Text style={[s.totK, ...(t.clay ? [s.clay] : [])]}>{t.label}</Text>
                    <Text style={[s.totV, ...(t.clay ? [s.clay] : [])]}>{t.value}</Text>
                  </View>
                ))}
                <View style={s.totalBar}>
                  <Text style={s.totalBarK}>TOTAL</Text>
                  <Text style={s.totalBarV}>{data.total}</Text>
                </View>
                {!!data.descuentoNota && (
                  <Text style={[s.clay, { textAlign: "center", marginTop: 4, fontSize: 8.5, fontWeight: 600 }]}>{data.descuentoNota}</Text>
                )}
              </>
            )}
            {!!data.fianza && (
              <View style={s.fianza}>
                <Text>Fianza (reembolsable)</Text>
                <Text style={{ fontWeight: 700 }}>{data.fianza}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Condiciones */}
        <View style={s.cond} wrap={false}>
          <Text style={s.label}>Condiciones</Text>
          {data.condiciones.map((c, i) => (
            <View style={s.condItem} key={i}>
              <Text>•</Text>
              <Text style={{ flex: 1 }}>{c}</Text>
            </View>
          ))}
          {!!data.pago && (
            <Text style={s.pago}>
              <Text style={{ fontWeight: 700, color: COL.ink }}>Pago: </Text>
              {data.pago}
            </Text>
          )}
          {!!data.notaAceptacion && <Text style={s.acepta}>{data.notaAceptacion}</Text>}
          <Text style={s.gracias}>{data.gracias}</Text>
        </View>
      </Page>

      {/* Página de Condiciones Generales de Contratación (protección legal).
          Van dentro del propio documento que el cliente acepta. */}
      {data.condicionesGenerales.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.ribbon} fixed />
          <Text style={s.cgTitulo}>Condiciones Generales de Contratación</Text>
          <Text style={s.cgSub}>
            Presupuesto Nº {data.numero} · {data.detalle.tipo}
          </Text>
          {data.condicionesGenerales.map((c, i) => (
            <View style={s.cgItem} key={i} wrap={false}>
              <Text style={s.cgNum}>{i + 1}.</Text>
              <Text style={s.cgCuerpo}>
                <Text style={s.cgClausulaK}>{c.titulo}. </Text>
                {c.texto}
              </Text>
            </View>
          ))}
          <Text style={s.cgPie}>{data.emisor.razon || data.emisor.nombre} · NIF {data.emisor.nif}</Text>
        </Page>
      )}
    </Document>
  );
}
