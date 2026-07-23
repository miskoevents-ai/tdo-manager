import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, Sparkles } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FichaTabs } from "@/components/oportunidades/FichaTabs";
import { SetupNotice } from "@/components/SetupNotice";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { PresupuestoEditor } from "@/components/oportunidades/PresupuestoEditor";
import { EmitirFacturaBtn, EstadoSelect, EnviarPresupuestoBtn, ValidarOportunidadBtn, BorrarOportunidadBtn } from "@/components/oportunidades/FichaAcciones";
import { FianzaPanel } from "@/components/oportunidades/FianzaPanel";
import { FotosReferencia } from "@/components/oportunidades/FotosReferencia";
import { SeguimientoTimeline } from "@/components/oportunidades/SeguimientoTimeline";
import { MaterialTab } from "@/components/reservas/MaterialTab";
import { PlanPagos, BorrarPrevistoBtn, MarcarCobradoBtn } from "@/components/oportunidades/PlanPagos";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { VersionesPresupuesto } from "@/components/oportunidades/VersionesPresupuesto";
import { SolicitarValidacionBtn } from "@/components/oportunidades/SolicitarValidacionBtn";
import { PresupuestoValidadoBtn } from "@/components/oportunidades/PresupuestoValidadoBtn";
import { FianzaSugerida } from "@/components/oportunidades/FianzaSugerida";
import { LogisticaChecklist } from "@/components/oportunidades/LogisticaChecklist";
import { CostesTab } from "@/components/costes/CostesTab";
import { ReunionesTab } from "@/components/oportunidades/ReunionesTab";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import {
  getOportunidad,
  getOportunidades,
  getClientes,
  getLugares,
  getTesoreriaDeOportunidad,
  getReservas,
  getInventario,
  getPartesHoras,
  getDesplazamientos,
  getReunionesDeOportunidad,
  getFotosReferencia,
  getSeguimientos,
  getEquipo,
  getProveedores,
  getKmPrecio,
  getFacturaDeOportunidad,
  getVersionesPresupuesto,
  getCostesEstimados,
  getComisionesConfig,
  getGastosFijos,
  getCalculadoraConfigRaw,
  getCalculoPrecio,
  getSueldos,
} from "@/lib/data";
import { costeHoraVigente } from "@/lib/coste-hora";
import { boteFijosMes } from "@/lib/calculadora-precio";
import { CalculadoraPrecio } from "@/components/calculadora/CalculadoraPrecio";
import { calcularTotales, resumenModalidades } from "@/lib/calc";
import { comisionDeOportunidad, comisionDetalleDeOportunidad } from "@/lib/comisiones";
import { eur, fecha } from "@/lib/format";
import { TIPO_EVENTO_LABEL, CANAL_LABEL, ESTADO_META, MOTIVO_PERDIDA_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </div>
      <div className="mt-0.5 text-[13px]">{value ?? "—"}</div>
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const { tab } = (await searchParams) ?? {};
  const TABS = ["datos", "seguimiento", "reuniones", "referencias", "presupuesto", "material", "costes", "cobros", "calculadora"];
  const tabInicial = tab && TABS.includes(tab) ? tab : "datos";

  const [op, clientes, lugares, cobros, reservas, inventario, partes, desplazamientos, equipo, proveedores, kmPrecio, reuniones, factura, versiones, costesEstimados, comConfig, gastosFijos, calcConfigRaw, calculoGuardado, todasOps, sueldos, fotosRef, seguimientos] =
    await Promise.all([
      getOportunidad(id),
      getClientes(),
      getLugares(),
      getTesoreriaDeOportunidad(id),
      getReservas(),
      getInventario(),
      getPartesHoras(id),
      getDesplazamientos(id),
      getEquipo(),
      getProveedores(),
      getKmPrecio(),
      getReunionesDeOportunidad(id),
      getFacturaDeOportunidad(id),
      getVersionesPresupuesto(id),
      getCostesEstimados(id),
      getComisionesConfig(),
      getGastosFijos(),
      getCalculadoraConfigRaw(),
      getCalculoPrecio(id),
      getOportunidades(),
      getSueldos(),
      getFotosReferencia(id),
      getSeguimientos(id),
    ]);
  if (!op) notFound();
  // Comisión del evento: cuenta como coste (afecta al margen).
  const comisionEvento = comisionDeOportunidad(op, comConfig);
  const comisionDetalle = comisionDetalleDeOportunidad(op, comConfig);

  // Compras/material = gastos de evento en tesorería que NO vienen de un
  // desplazamiento ni del pago a un ayudante externo (esos viven en su sección)
  const desplTesoIds = new Set(desplazamientos.map((d) => d.tesoreria_id).filter(Boolean));
  for (const p of partes) if (p.tesoreria_id) desplTesoIds.add(p.tesoreria_id);
  // Incluye también los gastos del evento que se pagaron por la caja de amigos
  // (naturaleza 'amigos'): siguen siendo coste del evento, aunque no computen
  // en la contabilidad oficial.
  const compras = cobros.filter(
    (m) =>
      (m.naturaleza === "gasto_de_evento" || (m.naturaleza === "amigos" && m.tipo === "gasto")) &&
      !desplTesoIds.has(m.id),
  );
  // Solo equipo activo: los desplegables de persona/pagador salen de aquí. El
  // €/hora es el COSTE REAL en la fecha del evento: para el equipo con sueldo y
  // horas de contrato se deriva del sueldo vigente ese mes (así sigue los
  // cambios de temporada); para el resto, su €/hora fijo. Migración 055.
  const fechaCoste =
    op.fecha_evento ??
    op.fecha_montaje ??
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const equipoLite = equipo
    .filter((e) => e.activo)
    .map((e) => ({ id: e.id, nombre: e.nombre, precio_hora: costeHoraVigente(e, sueldos, fechaCoste) }));
  const responsablesFicha = equipoLite.map((e) => e.nombre);
  const provLite = proveedores.map((p) => ({ id: p.id, nombre: p.nombre }));
  const lugarInfo = op.lugar
    ? { id: op.lugar.id, nombre: op.lugar.nombre, distancia_km: op.lugar.distancia_km ?? null }
    : null;

  const reservasEvento = reservas.filter((r) => r.oportunidad_id === id);
  const invLite = inventario.map((i) => ({
    id: i.id,
    articulo: i.articulo,
    cantidad_total: i.cantidad_total,
  }));
  const salidaDef = op.fecha_montaje ?? op.fecha_evento ?? "";
  const devolucionDef = op.fecha_recogida ?? op.fecha_evento ?? "";

  const t = calcularTotales(op.presupuesto_lineas ?? [], op.iva_pct, op.retencion_pct, op.descuento_pct ?? 0);
  // Si el presupuesto ofrece modalidades (opciones excluyentes), la cabecera
  // muestra el rango "desde/hasta" en vez del total plano — que sumaría las dos
  // opciones y confundiría (el cliente elige UNA).
  const rm = resumenModalidades(op.presupuesto_lineas ?? [], op.iva_pct, op.retencion_pct, op.descuento_pct ?? 0);
  const cobrado = op.cobrado ?? 0;
  const pendiente = Math.max(0, t.total - cobrado);
  const esEmpresa = op.cliente?.tipo === "empresa";

  // Calculadora de precio: bote de fijos del mes del evento (o del actual).
  const hoyMadrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const mesEvento = (op.fecha_evento ?? hoyMadrid).slice(0, 7);
  const boteFijos = boteFijosMes(gastosFijos, mesEvento);
  // Personas para el desplegable de la calculadora (socios detectados por rol).
  const esSocioDe = (nombre: string) =>
    (equipo.find((e) => e.nombre === nombre)?.rol ?? "").toLowerCase().includes("socio");
  const personasCalc = equipo
    .filter((e) => e.activo)
    .map((e) => ({
      nombre: e.nombre,
      precioHora: e.precio_hora != null ? Number(e.precio_hora) : null,
      esSocio: esSocioDe(e.nombre),
    }));

  // Costes REALES ya registrados (para comparar en la Calculadora estimado vs
  // real y poder "traerlos" y aplicarles margen). Los datos se introducen en
  // Costes; aquí solo se leen los totales.
  const realPorPersona = new Map<string, { horas: number; coste: number }>();
  for (const p of partes) {
    const nombre = p.equipo?.nombre ?? p.persona_externa ?? "Sin asignar";
    const acc = realPorPersona.get(nombre) ?? { horas: 0, coste: 0 };
    acc.horas += Number(p.horas);
    acc.coste += Number(p.horas) * Number(p.precio_hora);
    realPorPersona.set(nombre, acc);
  }
  const totalDesplazamientos = desplazamientos.reduce(
    (s, d) => s + Number(d.coste_gasolina ?? 0) + Number(d.peaje ?? 0) + Number(d.parking ?? 0),
    0,
  );
  const costesReales = {
    personas: Array.from(realPorPersona.entries()).map(([nombre, v]) => ({
      nombre,
      horas: v.horas,
      precioHora: v.horas > 0 ? v.coste / v.horas : 0,
      aportado: esSocioDe(nombre),
    })),
    materiales: compras.reduce((s, m) => s + Number(m.importe), 0),
    transporte: totalDesplazamientos,
    // Detalle línea a línea (para verlo desglosado en la calculadora).
    detalle: [
      ...compras.map((m) => ({
        concepto: m.concepto,
        tipo: "materiales" as const,
        importe: Number(m.importe),
      })),
      ...(totalDesplazamientos > 0
        ? [{ concepto: "Desplazamientos (gasolina, peajes, parking)", tipo: "transporte" as const, importe: totalDesplazamientos }]
        : []),
    ],
  };

  // Costes PREVISTOS (plan hecho en Costes antes del presupuesto). Es la fuente
  // única para la Calculadora: se meten una vez en Costes y la calculadora los
  // lee sola, sin reteclear. Personal → personas; desplazamiento → transporte;
  // material/flores/atrezzo → materiales (con mermas); dietas y alquiler → otros
  // (sin mermas: no son materiales físicos que se rompan).
  const nombreDeEquipo = (id: string | null | undefined) => equipo.find((e) => e.id === id)?.nombre ?? null;
  const esDietaOAlquiler = (categoria: string | null | undefined) => {
    const c = (categoria ?? "").toLowerCase();
    // Dietas, alquiler externo y almacén/logística: costes "otros" (sin mermas).
    return c.includes("dieta") || c.includes("comida") || c.includes("alquiler") ||
      c.includes("almac") || c.includes("logíst") || c.includes("logist") || c.includes("trastero");
  };
  const previstoPorPersona = new Map<string, { horas: number; coste: number }>();
  for (const e of costesEstimados) {
    if (e.categoria !== "personal") continue;
    const nombre = nombreDeEquipo(e.equipo_id) ?? e.persona_externa ?? "Sin asignar";
    const acc = previstoPorPersona.get(nombre) ?? { horas: 0, coste: 0 };
    acc.horas += Number(e.cantidad ?? 1);
    acc.coste += Number(e.importe);
    previstoPorPersona.set(nombre, acc);
  }
  const costesPrevistos = {
    personas: Array.from(previstoPorPersona.entries()).map(([nombre, v]) => ({
      nombre,
      horas: v.horas,
      precioHora: v.horas > 0 ? v.coste / v.horas : 0,
      aportado: esSocioDe(nombre),
    })),
    materiales: costesEstimados
      .filter((e) => e.categoria !== "personal" && e.categoria !== "desplazamiento" && !esDietaOAlquiler(e.categoria))
      .reduce((s, e) => s + Number(e.importe), 0),
    transporte: costesEstimados
      .filter((e) => e.categoria === "desplazamiento")
      .reduce((s, e) => s + Number(e.importe), 0),
    otros: costesEstimados
      .filter((e) => esDietaOAlquiler(e.categoria))
      .reduce((s, e) => s + Number(e.importe), 0),
    // Detalle línea a línea del plan (menos personal, que va como personas):
    // la calculadora lo enseña desglosado, igual que el equipo.
    detalle: costesEstimados
      .filter((e) => e.categoria !== "personal")
      .map((e) => ({
        concepto: e.concepto,
        tipo:
          e.categoria === "desplazamiento"
            ? ("transporte" as const)
            : esDietaOAlquiler(e.categoria)
              ? ("otros" as const)
              : ("materiales" as const),
        importe: Number(e.importe),
      })),
  };

  // Conflicto de fechas: otras oportunidades vivas el mismo día del evento.
  // No bloquea (la pauta es "se estudia con refuerzo"), pero avisa: los eventos
  // contratados en ámbar fuerte, y lo que está en conversación como nota suave.
  const CONTRATADA = ["confirmada", "en_produccion", "realizada", "facturada"];
  const mismoDia =
    op.fecha_evento && !["perdida", "descartada"].includes(op.estado)
      ? todasOps.filter(
          (o2) =>
            o2.id !== op.id &&
            o2.fecha_evento === op.fecha_evento &&
            !["perdida", "descartada"].includes(o2.estado),
        )
      : [];
  const conflictosFirmes = mismoDia.filter((o2) => CONTRATADA.includes(o2.estado));
  const conflictosPipeline = mismoDia.filter((o2) => !CONTRATADA.includes(o2.estado));

  return (
    <div className="space-y-5">
      <Link
        href="/oportunidades"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage"
      >
        <ArrowLeft size={14} /> Oportunidades
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-h3 font-normal">{op.titulo}</h2>
            <EstadoSelect oportunidadId={op.id} estado={op.estado} />
            {["perdida", "descartada"].includes(op.estado) && op.motivo_perdida && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-error-tint px-2.5 py-1 text-[11px] font-semibold text-error">
                Motivo: {MOTIVO_PERDIDA_LABEL[op.motivo_perdida] ?? op.motivo_perdida}
              </span>
            )}
            {/* Serie: evento propio vs alquiler/encargo — visible para no confundir
                (afecta a comisión, horas y a la calculadora de precio). */}
            {op.serie === "alquiler_encargo" ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-clay-tint px-2.5 py-1 text-[11px] font-semibold text-clay-600">
                📦 {op.es_encargo ? "Venta / encargo" : "Alquiler"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-2.5 py-1 text-[11px] font-semibold text-sage">
                🎪 Evento propio
              </span>
            )}
            {op.envio && (
              <span
                className="inline-flex items-center gap-1 rounded-pill bg-beige-warm px-2.5 py-1 text-[11px] font-semibold text-ink-secondary"
                title={op.envio_incluido ? "Envío incluido en el precio" : "Envío que se cobra aparte al cliente"}
              >
                📦 Envío{op.envio_coste ? ` ${eur(Number(op.envio_coste))}` : ""} ·{" "}
                {op.envio_incluido ? "incluido" : "aparte"}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Nº {op.numero} · {TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento}
            {op.tipo_operacion === "amigos_prestamo" && " · Amigos/préstamo"}
            {op.creado_por && ` · Creada por ${op.creado_por}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OportunidadDialog
            clientes={clientes}
            lugares={lugares}
            oportunidad={op}
            responsables={equipo.filter((e) => e.activo).map((e) => e.nombre)}
            equipo={equipo.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre }))}
            ocupadas={todasOps
              .filter((o2) => o2.id !== op.id && o2.fecha_evento && !["perdida", "descartada"].includes(o2.estado))
              .map((o2) => ({
                fecha: o2.fecha_evento!,
                titulo: o2.titulo,
                contratada: CONTRATADA.includes(o2.estado),
              }))}
          />
          {op.tipo_operacion === "amigos_prestamo" ? (
            <Link
              href={`/oportunidades/${op.id}/prestamo`}
              className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              <FileDown size={15} /> Nota de préstamo PDF
            </Link>
          ) : (
            <>
              <Link
                href={`/oportunidades/${op.id}/presupuesto`}
                className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
              >
                <FileDown size={15} /> Presupuesto PDF
              </Link>
              <Link
                href={`/oportunidades/${op.id}/propuesta`}
                className="inline-flex items-center gap-2 rounded-sm border-med border-clay bg-clay/10 px-4 py-2 text-[13px] font-semibold text-clay-600 hover:bg-clay/15"
              >
                <Sparkles size={15} /> Propuesta visual
              </Link>
            </>
          )}
          <EnviarPresupuestoBtn
            oportunidadId={op.id}
            numero={op.numero}
            titulo={op.titulo}
            clienteEmail={op.cliente?.email ?? null}
            clienteNombre={op.cliente?.nombre ?? null}
            total={eur(t.total)}
            baseNum={t.base}
            ivaPct={op.iva_pct}
            retPct={op.retencion_pct}
            serie={op.serie}
            pctFactura={op.pct_factura ?? null}
          />
          {["confirmada", "en_produccion", "realizada"].includes(op.estado) && !op.cerrada && (
            <ValidarOportunidadBtn oportunidadId={op.id} yaFacturada={Boolean(factura)} />
          )}
          {["confirmada", "en_produccion", "realizada"].includes(op.estado) &&
            op.tipo_operacion === "normal" &&
            !factura && <EmitirFacturaBtn oportunidadId={op.id} />}
          {factura && (
            <Link
              href={`/facturas/${factura.id}`}
              className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              <FileDown size={15} /> Factura {factura.numero}
            </Link>
          )}
        </div>
      </div>

      {/* Facturado por adelantado: hay factura pero el evento aún no se ha
          cerrado (producción pendiente). Evita confundir facturado con hecho. */}
      {factura && !op.cerrada && (
        <div className="rounded-md border-med border-clay bg-clay-tint px-4 py-3 text-[13px] text-clay-600">
          🧾 <b>Facturado por adelantado.</b> La factura {factura.numero} ya está emitida, pero el evento
          sigue <b>en marcha</b>: prepara la producción y, al terminar, ciérralo en <b>Costes</b> («Cerrar
          evento» o «Validar y facturar»). Facturar no significa que esté hecho.
        </div>
      )}

      {/* Conflicto de fechas: mismo día que otro evento */}
      {conflictosFirmes.length > 0 && (
        <div className="rounded-md border-med border-[#e7d3a6] bg-warn-tint px-4 py-3 text-[13px] text-[#7a5a1a]">
          ⚠️ <b>Ese día ya hay {conflictosFirmes.length === 1 ? "un evento contratado" : `${conflictosFirmes.length} eventos contratados`}:</b>{" "}
          {conflictosFirmes.map((c, i) => (
            <span key={c.id}>
              {i > 0 && " · "}
              <Link href={`/oportunidades/${c.id}`} className="font-semibold underline hover:opacity-80">
                {c.titulo}
              </Link>
            </span>
          ))}
          . Comprueba equipo, furgoneta y material — valora refuerzo externo antes de comprometer.
        </div>
      )}
      {conflictosPipeline.length > 0 && (
        <p className="text-[12px] text-ink-muted">
          ℹ️ Ese mismo día también hay en el pipeline:{" "}
          {conflictosPipeline.map((c, i) => (
            <span key={c.id}>
              {i > 0 && " · "}
              <Link href={`/oportunidades/${c.id}`} className="underline hover:text-sage">
                {c.titulo}
              </Link>{" "}
              ({ESTADO_META[c.estado].label})
            </span>
          ))}
        </p>
      )}

      {/* Resumen económico */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          rm.hay
            ? {
                l: "Total",
                v: `desde ${eur(rm.min)}`,
                c: "text-sage",
                sub: `hasta ${eur(rm.max)} · ${rm.opciones.length} opciones` as string | undefined,
              }
            : { l: "Total", v: eur(t.total), c: "text-sage", sub: undefined as string | undefined },
          { l: "Cobrado", v: eur(cobrado), c: "text-ok", sub: undefined as string | undefined },
          { l: "Pendiente", v: eur(pendiente), c: pendiente > 0.01 ? "text-error" : "text-ink", sub: undefined as string | undefined },
          {
            l: "Fianza",
            v: op.fianza ? eur(op.fianza) : "—",
            c: op.fianza && !op.fianza_devuelta ? "text-warn" : "text-ink",
            sub: undefined as string | undefined,
          },
        ].map((k) => (
          <Card key={k.l} className="relative overflow-hidden p-4 pl-[18px]">
            <span className={`absolute left-0 top-0 h-full w-[3px] ${k.c.replace("text-", "bg-")}`} />
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {k.l}
            </div>
            <div className={`mt-1 font-display text-[22px] tabular ${k.c}`}>{k.v}</div>
            {k.sub ? (
              <div className="mt-0.5 text-[11px] tabular text-ink-muted">{k.sub}</div>
            ) : null}
          </Card>
        ))}
      </div>

      <FichaTabs tabs={TABS} initial={tabInicial}>
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento{seguimientos.length > 0 ? ` (${seguimientos.length})` : ""}</TabsTrigger>
          <TabsTrigger value="reuniones">Reuniones</TabsTrigger>
          <TabsTrigger value="referencias">Referencias{fotosRef.length > 0 ? ` (${fotosRef.length})` : ""}</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="costes">Costes</TabsTrigger>
          <TabsTrigger value="calculadora">Calculadora</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="cobros">Cobros</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Dato label="Cliente" value={op.cliente?.nombre} />
              <Dato label="Lugar" value={op.lugar?.nombre} />
              <Dato label="Fecha evento" value={fecha(op.fecha_evento)} />
              <Dato label="Fecha de entrada" value={fecha(op.fecha_entrada)} />
              <Dato label="Canal" value={op.canal ? (CANAL_LABEL[op.canal] ?? op.canal) : null} />
              <Dato label="Invitados" value={op.n_invitados} />
              <Dato label="Responsable" value={op.responsable} />
              <Dato label="Creada por" value={op.creado_por} />
              <Dato
                label="Serie"
                value={op.serie === "alquiler_encargo" ? (op.es_encargo ? "Venta / encargo" : "Alquiler") : "Evento propio"}
              />
              <Dato label="IVA" value={`${op.iva_pct}%`} />
              <Dato
                label="Retención"
                value={op.retencion_pct ? `−${op.retencion_pct}%` : "Sin retención"}
              />
              <Dato
                label="Pago"
                value={op.pago_a_dias ? `A ${op.pago_a_dias} días` : "Al momento"}
              />
              <Dato label="Presupuesto enviado" value={op.presupuesto_enviado ? "Sí" : "No"} />
              <Dato label="Persona de contacto" value={op.cliente?.persona_contacto} />
              <Dato label="Horario de montaje" value={op.hora_montaje} />
              <Dato label="Horario de desmontaje" value={op.hora_desmontaje} />
            </div>
            {op.logistica && (
              <div className="mt-5 border-t border-border pt-4">
                <Overline>Logística del lugar</Overline>
                <p className="mt-1 whitespace-pre-line text-[13px] text-ink-secondary">{op.logistica}</p>
              </div>
            )}
            <div className="mt-5 border-t border-border pt-4">
              <LogisticaChecklist oportunidadId={op.id} inicial={op.logistica_checklist} />
            </div>
            {op.notas && (
              <div className="mt-5 border-t border-border pt-4">
                <Overline>Notas</Overline>
                <p className="mt-1 text-[13px] text-ink-secondary">{op.notas}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reuniones">
          <Card>
            <Overline className="!mt-0">Reuniones con el cliente</Overline>
            <div className="mt-3">
              <ReunionesTab
                oportunidadId={op.id}
                reuniones={reuniones}
                responsables={equipo.filter((e) => e.activo).map((e) => e.nombre)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="presupuesto">
          <Card>
            <PresupuestoEditor
              oportunidadId={op.id}
              lineasIniciales={op.presupuesto_lineas ?? []}
              ivaPct={op.iva_pct}
              retPct={op.retencion_pct}
              descuentoPct={op.descuento_pct ?? 0}
              esEmpresa={esEmpresa}
              catalogo={inventario.map((i) => ({
                id: i.id,
                articulo: i.articulo,
                precio_alquiler: i.precio_alquiler,
                fianza_sugerida: i.fianza_sugerida,
                foto_url: i.foto_url,
              }))}
              envioAparte={op.envio && !op.envio_incluido ? Number(op.envio_coste ?? 0) : 0}
            />
            <VersionesPresupuesto
              oportunidadId={op.id}
              versiones={versiones.map((v) => ({
                id: v.id,
                version: v.version,
                notas: v.notas,
                total: Number(v.total),
                created_at: v.created_at,
              }))}
            />
            {(() => {
              // Pauta: material en alquiler → fianza del 50% de ese material.
              // Alquiler/encargo: toda la base; evento: las líneas de catálogo.
              const dtoGlobal = 1 - Number(op.descuento_pct ?? 0) / 100;
              const baseCatalogo = (op.presupuesto_lineas ?? [])
                .filter((l) => l.articulo_id)
                .reduce(
                  (s, l) =>
                    s + Number(l.cantidad) * Number(l.precio_unitario) * (1 - Number(l.descuento_pct ?? 0) / 100),
                  0,
                ) * dtoGlobal;
              const baseAlquiler = op.serie === "alquiler_encargo" ? t.base : baseCatalogo;
              const fianzaSugerida = Math.round(baseAlquiler * 0.5);
              const fianzaActual = Number(op.fianza ?? 0);
              const mostrar =
                fianzaSugerida >= 1 &&
                fianzaActual < fianzaSugerida - 0.5 &&
                !["perdida", "descartada"].includes(op.estado);
              if (!mostrar) return null;
              return (
                <div className="mt-4">
                  <FianzaSugerida
                    oportunidadId={op.id}
                    baseAlquiler={baseAlquiler}
                    fianzaActual={fianzaActual}
                    fianzaSugerida={fianzaSugerida}
                  />
                </div>
              );
            })()}
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <PresupuestoValidadoBtn oportunidadId={op.id} estado={op.estado} />
              <SolicitarValidacionBtn oportunidadId={op.id} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="seguimiento">
          <Card>
            <Overline className="!mt-0">Seguimiento del contacto</Overline>
            <div className="mt-3">
              <SeguimientoTimeline oportunidadId={op.id} seguimientos={seguimientos} hoy={hoyMadrid} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="referencias">
          <Card>
            <Overline className="!mt-0">Fotos de referencia</Overline>
            <div className="mt-3">
              <FotosReferencia oportunidadId={op.id} fotos={fotosRef} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <Card>
            <Overline className="!mt-0">Material reservado</Overline>
            <div className="mt-3">
              <MaterialTab
                oportunidadId={op.id}
                reservasEvento={reservasEvento}
                reservasGlobal={reservas}
                inventario={invLite}
                fechaSalidaDefault={salidaDef}
                fechaDevolucionDefault={devolucionDef}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="costes">
          <CostesTab
            oportunidadId={op.id}
            base={t.base}
            partes={partes}
            desplazamientos={desplazamientos}
            compras={compras}
            equipo={equipoLite}
            proveedores={provLite}
            kmPrecio={kmPrecio}
            lugar={lugarInfo}
            catalogo={inventario.map((i) => ({ id: i.id, articulo: i.articulo, coste: Number(i.coste_unitario ?? 0) }))}
            otrasOportunidades={todasOps
              .filter((o) => o.id !== op.id)
              .map((o) => ({ id: o.id, titulo: o.titulo, numero: o.numero }))}
            estimados={costesEstimados}
            contingenciaPct={Number(op.contingencia_pct ?? 6)}
            margenObjetivoPct={Number(op.margen_objetivo_pct ?? 35)}
            cerrada={op.cerrada ?? false}
            cerradaFecha={op.cerrada_fecha ?? null}
            subproyectos={op.subproyectos ?? []}
            pendienteCobro={pendiente}
            comision={comisionEvento}
            comisionDetalle={comisionDetalle}
            categoriasGasto={Array.from(
              new Set([
                ...costesEstimados
                  .map((e) => e.categoria)
                  .filter((c): c is string => Boolean(c) && c !== "personal" && c !== "desplazamiento"),
                ...compras.map((m) => m.categoria).filter((c): c is string => Boolean(c)),
              ]),
            )}
          />
        </TabsContent>

        <TabsContent value="cobros">
          <Card>
            <div className="mb-3">
              <Overline className="!mt-0">Movimientos de cobro</Overline>
            </div>
            {op.fianza ? (
              <FianzaPanel
                oportunidadId={op.id}
                fianza={op.fianza}
                cobrada={op.fianza_cobrada !== false}
                devuelta={op.fianza_devuelta}
                fechaDevolucion={op.fecha_devolucion_fianza}
                retenidaImporte={op.fianza_retenida_importe ?? null}
                retenidaMotivo={op.fianza_retenida_motivo ?? null}
              />
            ) : null}
            {cobros.length === 0 && (
              <p className="py-2 text-small text-ink-muted">
                Sin movimientos de tesorería enlazados todavía.
              </p>
            )}
            {cobros.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-t border-border py-[10px] text-[13px] first:border-t-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span>
                    {c.concepto}
                    {c.naturaleza === "amigos" && (
                      <span className="ml-1.5 rounded-sm bg-clay-tint px-1.5 py-0.5 text-[10px] font-semibold text-clay">
                        sin IVA
                      </span>
                    )}
                  </span>
                  <small className="text-[11.5px] text-ink-muted">
                    {fecha(c.fecha)} · {c.metodo ?? "—"} ·{" "}
                    {c.estado === "cobrado" ? "Cobrado" : c.estado}
                  </small>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`tabular font-semibold ${
                      c.tipo === "ingreso" ? "text-ok" : "text-error"
                    }`}
                  >
                    {c.tipo === "ingreso" ? "+" : "−"}
                    {eur(Number(c.importe))}
                  </span>
                  {c.estado === "previsto" && c.tipo === "ingreso" && (
                    <MarcarCobradoBtn
                      id={c.id}
                      concepto={c.concepto}
                      importe={Number(c.importe)}
                      responsables={responsablesFicha}
                    />
                  )}
                  <MovimientoDialog
                    clientes={clientes}
                    oportunidades={[{ id: op.id, numero: op.numero, titulo: op.titulo }]}
                    proveedores={provLite}
                    responsables={responsablesFicha}
                    movimiento={c}
                  />
                  {c.estado === "previsto" && c.tipo === "ingreso" && (
                    <BorrarPrevistoBtn id={c.id} oportunidadId={op.id} />
                  )}
                </div>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t-2 border-ink pt-2 text-[14px] font-semibold">
              <span>Pendiente de cobro</span>
              <span className="tabular text-error">{eur(pendiente)}</span>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Overline className="!mt-0">Plan de pagos</Overline>
                {t.efectivo > 0 && (
                  <span className="text-[11.5px] text-ink-muted">
                    Presupuesto mixto: {eur(t.totalFactura)} con factura + {eur(t.efectivo)} en
                    efectivo (sin IVA)
                  </span>
                )}
              </div>
              <PlanPagos oportunidadId={op.id} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="calculadora">
          <CalculadoraPrecio
            oportunidadId={op.id}
            serie={op.serie ?? null}
            tipoEvento={op.tipo_evento ?? null}
            fechaEvento={op.fecha_evento ?? null}
            presupuestoBase={t.base}
            presupuestoLineasCount={(op.presupuesto_lineas ?? []).length}
            boteFijos={boteFijos}
            ivaPct={op.iva_pct ?? 21}
            configGuardada={calcConfigRaw}
            calculoInicial={calculoGuardado}
            personasEquipo={personasCalc}
            costesReales={costesReales}
            costesPrevistos={costesPrevistos}
          />
        </TabsContent>
      </FichaTabs>

      {/* Zona de peligro: eliminar la oportunidad (para pruebas o entradas erróneas). */}
      <div className="flex items-center justify-between gap-2 rounded-lg border-hair border-border-soft bg-white/60 px-4 py-3">
        <span className="text-[12px] text-ink-muted">
          ¿Entrada de prueba o errónea? Puedes eliminarla. Si es un cliente real que no cuajó, mejor
          márcala como <b>Rechazada</b> arriba.
        </span>
        <BorrarOportunidadBtn oportunidadId={op.id} titulo={op.titulo} />
      </div>
    </div>
  );
}
