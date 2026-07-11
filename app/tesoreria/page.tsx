import Link from "next/link";
import { Repeat, Truck, Percent } from "lucide-react";
import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { TesoreriaClient } from "@/components/tesoreria/TesoreriaClient";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getClientes, getOportunidades, getProveedores, getEquipo } from "@/lib/data";

export const dynamic = "force-dynamic";

const linkCls =
  "inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-sage transition-colors hover:bg-sage-tint";

export default async function TesoreriaPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, clientes, ops, proveedores, equipo;
  try {
    [movimientos, clientes, ops, proveedores, equipo] = await Promise.all([
      getTesoreria(),
      getClientes(),
      getOportunidades(),
      getProveedores(),
      getEquipo(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const oportunidades = ops.map((o) => ({ id: o.id, numero: o.numero, titulo: o.titulo }));
  const provs = proveedores.map((p) => ({ id: p.id, nombre: p.nombre }));
  const responsables = equipo.filter((e) => e.activo).map((e) => e.nombre);

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
        hoy={new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date())}
      />
    </div>
  );
}
