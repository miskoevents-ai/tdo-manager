import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { type KanbanCard } from "@/components/oportunidades/Kanban";
import { OportunidadesBoard } from "@/components/oportunidades/OportunidadesBoard";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getClientes, getLugares, getEquipo } from "@/lib/data";
import { calcularTotales, resumenModalidades } from "@/lib/calc";
import { probabilidadEfectiva } from "@/lib/estados";
import { eur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let ops, clientes, lugares, equipo;
  try {
    [ops, clientes, lugares, equipo] = await Promise.all([
      getOportunidades(),
      getClientes(),
      getLugares(),
      getEquipo(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }
  const activos = equipo.filter((e) => e.activo);
  const responsables = activos.map((e) => e.nombre);
  const equipoLite = activos.map((e) => ({ id: e.id, nombre: e.nombre }));

  // Nº de oportunidades por cliente → recurrente si tiene más de una.
  const opsPorCliente = new Map<string, number>();
  for (const o of ops) {
    if (o.cliente_id) opsPorCliente.set(o.cliente_id, (opsPorCliente.get(o.cliente_id) ?? 0) + 1);
  }

  const cards: KanbanCard[] = ops.map((o) => {
    const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
    // Con modalidades (opciones excluyentes) la tarjeta NO suma las opciones:
    // muestra "desde" la más barata para no inflar el pipeline.
    const rm = resumenModalidades(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
    const totalCard = rm.hay ? rm.min : t.total;
    return {
      id: o.id,
      numero: o.numero,
      titulo: o.titulo,
      estado: o.estado,
      cliente: o.cliente?.nombre ?? null,
      fecha_evento: o.fecha_evento,
      fecha_entrada: o.fecha_entrada,
      tipo_evento: o.tipo_evento,
      total: totalCard,
      nModalidades: rm.hay ? rm.opciones.length : 0,
      pendiente: Math.max(0, totalCard - (o.cobrado ?? 0)),
      probabilidad: probabilidadEfectiva(o),
      serie: o.serie,
      es_encargo: o.es_encargo ?? false,
      tipo_operacion: o.tipo_operacion,
      canal: o.canal,
      fianzaPendiente: Boolean((o.fianza ?? 0) > 0 && !o.fianza_devuelta),
      clienteRecurrente: o.cliente_id ? (opsPorCliente.get(o.cliente_id) ?? 0) > 1 : false,
    };
  });

  const activas = cards.filter((c) => !["perdida", "descartada"].includes(c.estado));
  // Pipeline: total (lo posible) vs ponderado por probabilidad (lo probable).
  const pipelineTotal = activas.reduce((s, c) => s + (c.total || 0), 0);
  const pipelinePonderado = activas.reduce((s, c) => s + (c.total || 0) * ((c.probabilidad ?? 0) / 100), 0);

  return (
    <div className="space-y-5">
      <InfoNote id="oportunidades">Cada solicitud y evento, desde que entra el lead hasta que se factura. Aquí gestionas los estados, los presupuestos y el seguimiento del pipeline.</InfoNote>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Overline className="!mt-0">{activas.length} oportunidades activas</Overline>
          <span className="text-[12px] text-ink-muted">
            Pipeline <b className="tabular text-ink-secondary">{eur(pipelineTotal)}</b>
            <span className="mx-1.5 text-ink-muted/50">·</span>
            ponderado <b className="tabular text-sage" title="Suma de total × probabilidad de cierre">{eur(pipelinePonderado)}</b>
          </span>
        </div>
        <OportunidadDialog
          clientes={clientes}
          lugares={lugares}
          responsables={responsables}
          equipo={equipoLite}
          ocupadas={activas
            .filter((c) => c.fecha_evento)
            .map((c) => ({
              fecha: c.fecha_evento!,
              titulo: c.titulo,
              contratada: ["confirmada", "en_produccion", "realizada", "facturada"].includes(c.estado),
            }))}
        />
      </div>

      <OportunidadesBoard cards={cards} />
    </div>
  );
}
