import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { NuevaFacturaForm } from "@/components/facturas/NuevaFacturaForm";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getClientes, getFacturas } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NuevaFacturaPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let clientes, facturas;
  try {
    [clientes, facturas] = await Promise.all([getClientes(), getFacturas()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

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
        numeroSugerido={numeroSugerido}
        hoy={hoy}
      />
    </div>
  );
}
