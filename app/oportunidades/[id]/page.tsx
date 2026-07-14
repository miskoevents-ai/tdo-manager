import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SetupNotice } from "@/components/SetupNotice";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { PresupuestoEditor } from "@/components/oportunidades/PresupuestoEditor";
import { EmitirFacturaBtn, FianzaBtn, EstadoSelect, EnviarPresupuestoBtn, ValidarOportunidadBtn } from "@/components/oportunidades/FichaAcciones";
import { MaterialTab } from "@/components/reservas/MaterialTab";
import { PlanPagos, BorrarPrevistoBtn, MarcarCobradoBtn } from "@/components/oportunidades/PlanPagos";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { VersionesPresupuesto } from "@/components/oportunidades/VersionesPresupuesto";
import { CostesTab } from "@/components/costes/CostesTab";
import { ReunionesTab } from "@/components/oportunidades/ReunionesTab";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import {
  getOportunidad,
  getClientes,
  getLugares,
  getTesoreriaDeOportunidad,
  getReservas,
  getInventario,
  getPartesHoras,
  getDesplazamientos,
  getReunionesDeOportunidad,
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
} from "@/lib/data";
import { boteFijosMes } from "@/lib/calculadora-precio";
import { CalculadoraPrecio } from "@/components/calculadora/CalculadoraPrecio";
import { calcularTotales } from "@/lib/calc";
import { comisionDeOportunidad, comisionDetalleDeOportunidad } from "@/lib/comisiones";
import { eur, fecha } from "@/lib/format";
import { TIPO_EVENTO_LABEL, CANAL_LABEL } from "@/lib/estados";

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
  const TABS = ["datos", "reuniones", "presupuesto", "material", "costes", "cobros", "calculadora"];
  const tabInicial = tab && TABS.includes(tab) ? tab : "datos";

  const [op, clientes, lugares, cobros, reservas, inventario, partes, desplazamientos, equipo, proveedores, kmPrecio, reuniones, factura, versiones, costesEstimados, comConfig, gastosFijos, calcConfigRaw, calculoGuardado] =
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
  // Solo equipo activo: los desplegables de persona/pagador salen de aquí.
  const equipoLite = equipo
    .filter((e) => e.activo)
    .map((e) => ({ id: e.id, nombre: e.nombre, precio_hora: e.precio_hora }));
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
  const costesReales = {
    personas: Array.from(realPorPersona.entries()).map(([nombre, v]) => ({
      nombre,
      horas: v.horas,
      precioHora: v.horas > 0 ? v.coste / v.horas : 0,
      aportado: esSocioDe(nombre),
    })),
    materiales: compras.reduce((s, m) => s + Number(m.importe), 0),
    transporte: desplazamientos.reduce(
      (s, d) => s + Number(d.coste_gasolina ?? 0) + Number(d.peaje ?? 0) + Number(d.parking ?? 0),
      0,
    ),
  };

  // Costes PREVISTOS (plan hecho en Costes antes del presupuesto). Es la fuente
  // única para la Calculadora: se meten una vez en Costes y la calculadora los
  // lee sola, sin reteclear. Personal → personas; desplazamiento → transporte;
  // todo lo demás (material, flores, atrezzo…) → materiales.
  const nombreDeEquipo = (id: string | null | undefined) => equipo.find((e) => e.id === id)?.nombre ?? null;
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
      .filter((e) => e.categoria !== "personal" && e.categoria !== "desplazamiento")
      .reduce((s, e) => s + Number(e.importe), 0),
    transporte: costesEstimados
      .filter((e) => e.categoria === "desplazamiento")
      .reduce((s, e) => s + Number(e.importe), 0),
  };

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
            {/* Serie: evento propio vs alquiler/encargo — visible para no confundir
                (afecta a comisión, horas y a la calculadora de precio). */}
            {op.serie === "alquiler_encargo" ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-clay-tint px-2.5 py-1 text-[11px] font-semibold text-clay-600">
                📦 Alquiler / encargo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-2.5 py-1 text-[11px] font-semibold text-sage">
                🎪 Evento propio
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
          />
          {op.tipo_operacion === "amigos_prestamo" ? (
            <Link
              href={`/oportunidades/${op.id}/prestamo`}
              className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              <FileDown size={15} /> Nota de préstamo PDF
            </Link>
          ) : (
            <Link
              href={`/oportunidades/${op.id}/presupuesto`}
              className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              <FileDown size={15} /> Presupuesto PDF
            </Link>
          )}
          <EnviarPresupuestoBtn
            oportunidadId={op.id}
            numero={op.numero}
            titulo={op.titulo}
            clienteEmail={op.cliente?.email ?? null}
            clienteNombre={op.cliente?.nombre ?? null}
            total={eur(t.total)}
          />
          {["confirmada", "realizada"].includes(op.estado) && !op.cerrada && (
            <ValidarOportunidadBtn oportunidadId={op.id} yaFacturada={Boolean(factura)} />
          )}
          {["confirmada", "realizada"].includes(op.estado) &&
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

      {/* Resumen económico */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Total", v: eur(t.total), c: "text-sage" },
          { l: "Cobrado", v: eur(cobrado), c: "text-ok" },
          { l: "Pendiente", v: eur(pendiente), c: pendiente > 0.01 ? "text-error" : "text-ink" },
          {
            l: "Fianza",
            v: op.fianza ? eur(op.fianza) : "—",
            c: op.fianza && !op.fianza_devuelta ? "text-warn" : "text-ink",
          },
        ].map((k) => (
          <Card key={k.l} className="relative overflow-hidden p-4 pl-[18px]">
            <span className={`absolute left-0 top-0 h-full w-[3px] ${k.c.replace("text-", "bg-")}`} />
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {k.l}
            </div>
            <div className={`mt-1 font-display text-[22px] tabular ${k.c}`}>{k.v}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="reuniones">Reuniones</TabsTrigger>
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
              <Dato label="Serie" value={op.serie === "evento" ? "Evento" : "Alquiler / encargo"} />
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
            estimados={costesEstimados}
            contingenciaPct={Number(op.contingencia_pct ?? 5)}
            margenObjetivoPct={Number(op.margen_objetivo_pct ?? 35)}
            cerrada={op.cerrada ?? false}
            cerradaFecha={op.cerrada_fecha ?? null}
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
            <div className="mb-3 flex items-center justify-between">
              <Overline className="!mt-0">Movimientos de cobro</Overline>
              {op.fianza ? (
                <FianzaBtn oportunidadId={op.id} devuelta={op.fianza_devuelta} />
              ) : null}
            </div>
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
            boteFijos={boteFijos}
            ivaPct={op.iva_pct ?? 21}
            configGuardada={calcConfigRaw}
            calculoInicial={calculoGuardado}
            personasEquipo={personasCalc}
            costesReales={costesReales}
            costesPrevistos={costesPrevistos}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
