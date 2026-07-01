import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { Kanban, type KanbanCard } from "@/components/oportunidades/Kanban";
import { OportunidadDialog } from "@/components/oportunidades/OportunidadDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getClientes, getLugares } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let ops, clientes, lugares;
  try {
    [ops, clientes, lugares] = await Promise.all([
      getOportunidades(),
      getClientes(),
      getLugares(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
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
    };
  });

  const activas = cards.filter((c) => !["perdida", "descartada"].includes(c.estado));
  const cerradas = cards.filter((c) => ["perdida", "descartada"].includes(c.estado));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{activas.length} oportunidades activas</Overline>
        <OportunidadDialog clientes={clientes} lugares={lugares} />
      </div>

      <Kanban cards={activas} />

      {cerradas.length > 0 && (
        <details className="rounded-lg border-hair border-border bg-white p-4">
          <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Perdidas / descartadas ({cerradas.length})
          </summary>
          <div className="mt-3 space-y-1 text-[13px]">
            {cerradas.map((c) => (
              <a
                key={c.id}
                href={`/oportunidades/${c.id}`}
                className="flex justify-between border-t border-border py-2 hover:text-clay"
              >
                <span>{c.titulo}</span>
                <span className="text-ink-muted">{c.cliente ?? "—"}</span>
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
