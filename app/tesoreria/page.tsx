import Link from "next/link";
import { Repeat, Truck, Percent } from "lucide-react";
import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { TesoreriaClient } from "@/components/tesoreria/TesoreriaClient";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { ResumenComisiones } from "@/components/comisiones/ResumenComisiones";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getClientes, getOportunidades, getProveedores, getEquipo, getComisionesConfig, getComisiones } from "@/lib/data";
import { computeDevengos, resumenComisiones } from "@/lib/comisiones";

export const dynamic = "force-dynamic";

const linkCls =
  "inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-sage transition-colors hover:bg-sage-tint";

export default async function TesoreriaPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, clientes, ops, proveedores, equipo, comConfig, comPagadas;
  try {
    [movimientos, clientes, ops, proveedores, equipo, comConfig, comPagadas] = await Promise.all([
      getTesoreria(),
      getClientes(),
      getOportunidades(),
      getProveedores(),
      getEquipo(),
      getComisionesConfig(),
      getComisiones(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const oportunidades = ops.map((o) => ({ id: o.id, numero: o.numero, titulo: o.titulo }));
  const provs = proveedores.map((p) => ({ id: p.id, nombre: p.nombre }));
  const responsables = equipo.filter((e) => e.activo).map((e) => e.nombre);
  // Quien actúa como caja de TDO (Jero hasta que exista la SL): sus cobros y
  // pagos no generan cuentas pendientes con el equipo.
  const personasCaja = equipo.filter((e) => e.activo && e.es_caja).map((e) => e.nombre);
  const resumenCom = resumenComisiones(computeDevengos(ops, comConfig, comPagadas));

  // Plan de cobros por solicitud: ingresos previstos enlazados a una oportunidad,
  // para cuadrar concepto e importe al registrar el cobro real.
  const planPorOportunidad: Record<string, { id: string; concepto: string; importe: number }[]> = {};
  for (const m of movimientos) {
    if (!m.oportunidad_id || m.tipo !== "ingreso") continue;
    if (m.estado !== "previsto" && m.estado !== "vencido") continue;
    (planPorOportunidad[m.oportunidad_id] ??= []).push({
      id: m.id,
      concepto: m.concepto,
      importe: Number(m.importe),
    });
  }

  return (
    <div className="space-y-5">
      <InfoNote id="tesoreria">La caja del negocio: todo el dinero que entra y sale, con o sin factura. Arriba ves lo pendiente de pagar. Es la base de la que sale la Contabilidad.</InfoNote>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Overline className="!mt-0">Tesorería</Overline>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/gastos-fijos" className={linkCls}>
            <Repeat size={14} /> Gastos fijos
          </Link>
          <Link href="/proveedores" className={linkCls}>
            <Truck size={14} /> Proveedores
          </Link>
          <Link href="/comisiones" className={linkCls}>
            <Percent size={14} /> Comisiones
          </Link>
          <MovimientoDialog
            clientes={clientes}
            oportunidades={oportunidades}
            proveedores={provs}
            responsables={responsables}
            planPorOportunidad={planPorOportunidad}
            categoriasExtra={Array.from(
              new Set(movimientos.map((m) => m.categoria).filter((c): c is string => Boolean(c))),
            )}
          />
        </div>
      </div>
      <TesoreriaClient
        movimientos={movimientos}
        clientes={clientes}
        oportunidades={oportunidades}
        proveedores={provs}
        responsables={responsables}
        personasCaja={personasCaja}
        planPorOportunidad={planPorOportunidad}
        hoy={new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date())}
      />
      <ResumenComisiones {...resumenCom} />
    </div>
  );
}
