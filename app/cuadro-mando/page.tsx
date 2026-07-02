import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CuadroMando, type OpRow } from "@/components/cuadro/CuadroMando";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";

export const dynamic = "force-dynamic";

const CONTRATADAS = ["confirmada", "realizada", "facturada"];

export default async function CuadroMandoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let rows: OpRow[];
  try {
    const [ops, tesoreria] = await Promise.all([getOportunidades(), getTesoreria()]);

    // Gastos de evento registrados en tesorería, por oportunidad.
    const gastoPorOp = new Map<string, number>();
    for (const t of tesoreria) {
      if (t.tipo === "gasto" && t.oportunidad_id) {
        gastoPorOp.set(t.oportunidad_id, (gastoPorOp.get(t.oportunidad_id) ?? 0) + Number(t.importe));
      }
    }
    // Nº de oportunidades por cliente → recurrente si tiene más de una.
    const opsPorCliente = new Map<string, number>();
    for (const o of ops) {
      if (o.cliente_id) opsPorCliente.set(o.cliente_id, (opsPorCliente.get(o.cliente_id) ?? 0) + 1);
    }
    const diasEntre = (a?: string | null, b?: string | null) => {
      if (!a || !b) return null;
      const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
      return isNaN(ms) ? null : Math.max(0, Math.round(ms / 86_400_000));
    };

    rows = ops.map((o) => {
      const total = calcularTotales(
        (o.presupuesto_lineas ?? []).map((l) => ({
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
        o.iva_pct,
        o.retencion_pct,
      ).total;
      const cobrado = o.cobrado ?? 0;
      const gastos = gastoPorOp.get(o.id) ?? 0;
      return {
        id: o.id,
        titulo: o.titulo,
        estado: o.estado,
        contratada: CONTRATADAS.includes(o.estado),
        tipoEvento: o.tipo_evento,
        serie: o.serie,
        canal: o.canal,
        tipoOperacion: o.tipo_operacion,
        cliente: o.cliente?.nombre ?? null,
        lugar: o.lugar?.nombre ?? null,
        responsable: o.responsable ?? null,
        fecha: o.fecha_evento,
        ym: o.fecha_evento ? o.fecha_evento.slice(0, 7) : null,
        total,
        cobrado,
        pendiente: Math.max(0, total - cobrado),
        gastos,
        margen: total - gastos,
        fianza: (o.fianza ?? 0) > 0 && !o.fianza_devuelta ? Number(o.fianza) : 0,
        clienteRecurrente: o.cliente_id ? (opsPorCliente.get(o.cliente_id) ?? 0) > 1 : false,
        diasCierre: diasEntre(o.fecha_entrada, o.fecha_confirmacion),
      };
    });
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="cuadro-mando">Análisis y gráficas del negocio: de dónde vienen los eventos, facturación y conversión de leads. Pincha en las gráficas para ver el detalle.</InfoNote>
      <div>
        <Overline className="!mt-0">Cuadro de mando</Overline>
        <p className="mt-1 text-[12px] text-ink-muted">
          Analítica del negocio con filtros. El margen es de caja (ingresos − gastos de evento registrados);
          no incluye horas de personal salvo que se registren como gasto.
        </p>
      </div>
      <CuadroMando rows={rows} />
    </div>
  );
}
