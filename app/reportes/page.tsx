import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ReportesPipeline, type PipeRow } from "@/components/reportes/ReportesPipeline";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria } from "@/lib/data";
import { calcularTotales, resumenModalidades } from "@/lib/calc";
import { probabilidadEfectiva } from "@/lib/estados";
import { hoyMadrid } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let rows: PipeRow[];
  try {
    const [ops, tesoreria] = await Promise.all([getOportunidades(), getTesoreria()]);

    // Cobrado real por oportunidad (ingresos ya cobrados).
    const cobradoPorOp = new Map<string, number>();
    for (const t of tesoreria) {
      if (t.tipo === "ingreso" && t.estado === "cobrado" && t.oportunidad_id) {
        cobradoPorOp.set(t.oportunidad_id, (cobradoPorOp.get(t.oportunidad_id) ?? 0) + Number(t.importe));
      }
    }

    rows = ops.map((o) => {
      const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
      // Con modalidades excluyentes se toma "desde" (la más barata) para no
      // inflar el pipeline — igual que en el Kanban.
      const rm = resumenModalidades(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
      const total = rm.hay ? rm.min : t.total;
      return {
        id: o.id,
        titulo: o.titulo,
        estado: o.estado,
        tipoEvento: o.tipo_evento,
        serie: o.serie,
        esEncargo: o.es_encargo ?? false,
        canal: o.canal ?? null,
        cliente: o.cliente?.nombre ?? null,
        fechaEvento: o.fecha_evento,
        fechaEntrada: o.fecha_entrada,
        fechaConfirmacion: o.fecha_confirmacion ?? null,
        motivoPerdida: o.motivo_perdida ?? null,
        total,
        cobrado: cobradoPorOp.get(o.id) ?? 0,
        prob: probabilidadEfectiva(o), // 0..100
      };
    });
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <Link href="/cuadro-mando" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-sage hover:text-sage-600">
        <ArrowLeft size={14} /> Cuadro de mando
      </Link>
      <InfoNote id="reportes">
        Radiografía del pipeline: cuánto dinero hay en juego, en qué etapa, qué se espera cobrar cada mes,
        de dónde vienen las ventas y qué oportunidades se están enfriando. Puedes filtrar e imprimir en PDF.
      </InfoNote>
      <Overline className="!mt-0">Reports · Pipeline</Overline>
      <ReportesPipeline rows={rows} hoy={hoyMadrid()} />
    </div>
  );
}
