import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SetupNotice } from "@/components/SetupNotice";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { PresupuestoEditor } from "@/components/oportunidades/PresupuestoEditor";
import { EmitirFacturaBtn, FianzaBtn } from "@/components/oportunidades/FichaAcciones";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad, getClientes, getLugares, getTesoreriaDeOportunidad } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha } from "@/lib/format";
import { ESTADO_META, TIPO_EVENTO_LABEL, CANAL_LABEL } from "@/lib/estados";

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

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;

  const [op, clientes, lugares, cobros] = await Promise.all([
    getOportunidad(id),
    getClientes(),
    getLugares(),
    getTesoreriaDeOportunidad(id),
  ]);
  if (!op) notFound();

  const t = calcularTotales(
    (op.presupuesto_lineas ?? []).map((l) => ({
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    })),
    op.iva_pct,
    op.retencion_pct,
  );
  const cobrado = op.cobrado ?? 0;
  const pendiente = Math.max(0, t.total - cobrado);
  const meta = ESTADO_META[op.estado];
  const esEmpresa = op.cliente?.tipo === "empresa";

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
          <div className="flex items-center gap-3">
            <h2 className="font-display text-h3 font-normal">{op.titulo}</h2>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Nº {op.numero} · {TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento}
            {op.tipo_operacion === "amigos_prestamo" && " · Amigos/préstamo"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OportunidadDialog clientes={clientes} lugares={lugares} oportunidad={op} />
          {["confirmada", "realizada"].includes(op.estado) &&
            op.tipo_operacion === "normal" && <EmitirFacturaBtn oportunidadId={op.id} />}
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
          <Card key={k.l} className="p-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {k.l}
            </div>
            <div className={`mt-1 font-display text-[22px] tabular ${k.c}`}>{k.v}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
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

        <TabsContent value="presupuesto">
          <Card>
            <PresupuestoEditor
              oportunidadId={op.id}
              lineasIniciales={op.presupuesto_lineas ?? []}
              ivaPct={op.iva_pct}
              retPct={op.retencion_pct}
              esEmpresa={esEmpresa}
            />
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <Card className="max-w-container-narrow">
            <Overline className="text-clay">Fase 3</Overline>
            <p className="mt-2 text-small text-ink-secondary">
              Reserva de material del inventario con fechas de salida y devolución, y control de
              disponibilidad para no vender dos veces la misma pieza. Llegará con el módulo de
              Inventario (Fase 3).
            </p>
          </Card>
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
                  <span>{c.concepto}</span>
                  <small className="text-[11.5px] text-ink-muted">
                    {fecha(c.fecha)} · {c.metodo ?? "—"} ·{" "}
                    {c.estado === "cobrado" ? "Cobrado" : c.estado}
                  </small>
                </div>
                <span
                  className={`tabular font-semibold ${
                    c.tipo === "ingreso" ? "text-ok" : "text-error"
                  }`}
                >
                  {c.tipo === "ingreso" ? "+" : "−"}
                  {eur(Number(c.importe))}
                </span>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t-2 border-ink pt-2 text-[14px] font-semibold">
              <span>Pendiente de cobro</span>
              <span className="tabular text-error">{eur(pendiente)}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
