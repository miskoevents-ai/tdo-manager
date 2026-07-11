import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { RecordatorioBtn } from "@/components/mensajes/RecordatorioBtn";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getCliente, getOportunidades } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha } from "@/lib/format";
import { ESTADO_META, TIPO_EVENTO_LABEL, CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { Cliente, Oportunidad } from "@/lib/types";

export const dynamic = "force-dynamic";
const CONTRATADAS = ["confirmada", "realizada", "facturada"];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;

  let cliente: Cliente | null;
  let ops: Oportunidad[];
  try {
    [cliente, ops] = await Promise.all([getCliente(id), getOportunidades()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }
  if (!cliente) notFound();

  const suyas = ops
    .filter((o) => o.cliente_id === id)
    .map((o) => {
      const total = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
      return { o, total, pendiente: Math.max(0, total - (o.cobrado ?? 0)) };
    })
    .sort((a, b) => (b.o.fecha_evento ?? "").localeCompare(a.o.fecha_evento ?? ""));

  const contratadas = suyas.filter((x) => CONTRATADAS.includes(x.o.estado));
  const facturado = contratadas.reduce((s, x) => s + x.total, 0);
  const cobrado = contratadas.reduce((s, x) => s + (x.o.cobrado ?? 0), 0);
  const pendiente = contratadas.reduce((s, x) => s + x.pendiente, 0);
  const fianzas = suyas
    .filter((x) => (x.o.fianza ?? 0) > 0 && !x.o.fianza_devuelta)
    .reduce((s, x) => s + (x.o.fianza ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h3 font-normal">{cliente.nombre}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
            <Badge tone={cliente.estado === "cliente" ? "ok" : "sage"}>
              {cliente.estado === "cliente" ? "Cliente" : "Lead"}
            </Badge>
            <span>{CLIENTE_TIPO_LABEL[cliente.tipo] ?? cliente.tipo}</span>
            {cliente.localidad && <span>· {cliente.localidad}</span>}
          </div>
        </div>
      </div>

      {/* Contacto */}
      {(cliente.email || cliente.telefono || cliente.direccion) && (
        <Card className="!p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`} className="inline-flex items-center gap-1.5 hover:text-sage">
                <Phone size={14} className="text-ink-muted" /> {cliente.telefono}
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1.5 hover:text-sage">
                <Mail size={14} className="text-ink-muted" /> {cliente.email}
              </a>
            )}
            {cliente.direccion && (
              <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                <MapPin size={14} className="text-ink-muted" /> {cliente.direccion}
                {cliente.localidad ? `, ${cliente.localidad}` : ""}
              </span>
            )}
            {cliente.nif_cif && <span className="text-ink-secondary">NIF: {cliente.nif_cif}</span>}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Oportunidades" value={String(suyas.length)} tone="text-ink" />
        <Kpi label="Facturado" value={eur(facturado)} tone="text-sage" />
        <Kpi label="Cobrado" value={eur(cobrado)} tone="text-ok" />
        <Kpi label="Pendiente" value={eur(pendiente)} tone={pendiente > 0.01 ? "text-error" : "text-ink"} />
        <Kpi label="Fianzas activas" value={eur(fianzas)} tone="text-warn" />
      </div>

      {/* Oportunidades del cliente */}
      <Card>
        <Overline className="!mt-0">Historial de oportunidades</Overline>
        {suyas.length === 0 && <p className="mt-2 text-small text-ink-muted">Este cliente aún no tiene oportunidades.</p>}
        <div className="mt-2">
          {suyas.map(({ o, total, pendiente }) => {
            const meta = ESTADO_META[o.estado];
            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3 first:border-t-0">
                <Link href={`/oportunidades/${o.id}`} className="group flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium group-hover:text-clay">{o.titulo}</div>
                    <div className="text-[11.5px] text-ink-muted">
                      {fecha(o.fecha_evento)} · {TIPO_EVENTO_LABEL[o.tipo_evento] ?? o.tipo_evento} · Nº {o.numero}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[13px] tabular font-semibold">{eur(total)}</div>
                    {pendiente > 0.01 && <div className="text-[11px] tabular text-error">Pend. {eur(pendiente)}</div>}
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {pendiente > 0.01 && CONTRATADAS.includes(o.estado) && (
                    <RecordatorioBtn
                      tipo="cobro"
                      compact
                      nombre={cliente!.nombre}
                      titulo={o.titulo}
                      importe={pendiente}
                      telefono={cliente!.telefono}
                      email={cliente!.email}
                    />
                  )}
                  {(o.fianza ?? 0) > 0 && !o.fianza_devuelta && (
                    <RecordatorioBtn
                      tipo="fianza"
                      compact
                      nombre={cliente!.nombre}
                      titulo={o.titulo}
                      importe={o.fianza}
                      telefono={cliente!.telefono}
                      email={cliente!.email}
                    />
                  )}
                  <Link href={`/oportunidades/${o.id}`} className="text-ink-muted hover:text-sage">
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  const bar = tone.replace("text-", "bg-");
  return (
    <Card className="relative overflow-hidden p-4 pl-[18px]">
      <span className={`absolute left-0 top-0 h-full w-[3px] ${bar}`} />
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[20px] tabular ${tone}`}>{value}</div>
    </Card>
  );
}
