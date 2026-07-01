import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { type KanbanCard } from "@/components/oportunidades/Kanban";
import { OportunidadesBoard } from "@/components/oportunidades/OportunidadesBoard";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getClientes, getLugares, getEquipo } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";

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
  const responsables = equipo.filter((e) => e.activo).map((e) => e.nombre);

  // Nº de oportunidades por cliente → recurrente si tiene más de una.
  const opsPorCliente = new Map<string, number>();
  for (const o of ops) {
    if (o.cliente_id) opsPorCliente.set(o.cliente_id, (opsPorCliente.get(o.cliente_id) ?? 0) + 1);
  }

  const cards: KanbanCard[] = ops.map((o) => {
    const t = calcularTotales(
      (o.presupuesto_lineas ?? []).map((l) => ({
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
      o.iva_pct,
      o.retencion_pct,
    );
    return {
      id: o.id,
      numero: o.numero,
      titulo: o.titulo,
      estado: o.estado,
      cliente: o.cliente?.nombre ?? null,
      fecha_evento: o.fecha_evento,
      tipo_evento: o.tipo_evento,
      total: t.total,
      pendiente: Math.max(0, t.total - (o.cobrado ?? 0)),
      serie: o.serie,
      tipo_operacion: o.tipo_operacion,
      canal: o.canal,
      fianzaPendiente: Boolean((o.fianza ?? 0) > 0 && !o.fianza_devuelta),
      clienteRecurrente: o.cliente_id ? (opsPorCliente.get(o.cliente_id) ?? 0) > 1 : false,
    };
  });

  const activas = cards.filter((c) => !["perdida", "descartada"].includes(c.estado));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{activas.length} oportunidades activas</Overline>
        <OportunidadDialog clientes={clientes} lugares={lugares} responsables={responsables} />
      </div>

      <OportunidadesBoard cards={cards} />
    </div>
  );
}
