import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { NuevaFacturaForm, type PresupuestoOrigen } from "@/components/facturas/NuevaFacturaForm";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getClientes, getFacturas, getOportunidades } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function NuevaFacturaPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let clientes, facturas, ops;
  try {
    [clientes, facturas, ops] = await Promise.all([
      getClientes(),
      getFacturas(),
      getOportunidades(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  // Presupuestos que pueden servir de punto de partida (con líneas), los más
  // recientes primero.
  const presupuestos: PresupuestoOrigen[] = ops
    .filter((o) => (o.presupuesto_lineas ?? []).length > 0)
    .map((o) => {
      const lineas = (o.presupuesto_lineas ?? [])
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((l) => ({
          concepto: l.concepto,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
          via: l.via === "efectivo" ? "efectivo" : "factura",
          descuento_pct: l.descuento_pct ?? null,
        }));
      const t = calcularTotales(lineas, o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
      return {
        oportunidadId: o.id,
        numero: o.numero,
        titulo: o.titulo,
        clienteId: o.cliente_id,
        clienteNombre: o.cliente?.nombre ?? null,
        ivaPct: o.iva_pct,
        retPct: o.retencion_pct,
        descuentoPct: o.descuento_pct ?? null,
        total: t.total,
        lineas,
      };
    })
    .sort((a, b) => (a.numero && b.numero ? (a.numero < b.numero ? 1 : -1) : 0));

  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const yy = hoy.slice(2, 4);
  const maxFac = facturas.reduce((mx, f) => {
    const n = f.numero;
    return /^\d{5}$/.test(n) && n.startsWith(yy) ? Math.max(mx, Number(n.slice(2))) : mx;
  }, 0);
  const numeroSugerido = `${yy}${String(maxFac + 1).padStart(3, "0")}`;

  return (
    <div className="mx-auto max-w-[860px] space-y-5">
      <Link
        href="/facturas"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage"
      >
        <ArrowLeft size={14} /> Volver a documentos
      </Link>
      <div>
        <h2 className="font-display text-h3 font-normal">Nueva factura</h2>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          Factura libre, sin pasar por una oportunidad. Se numera sola (siguiente:{" "}
          <b className="tabular">{numeroSugerido}</b>) y deja su cobro en Tesorería y Contabilidad.
        </p>
      </div>
      <NuevaFacturaForm
        clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, nif_cif: c.nif_cif }))}
        presupuestos={presupuestos}
        numeroSugerido={numeroSugerido}
        hoy={hoy}
      />
    </div>
  );
}
