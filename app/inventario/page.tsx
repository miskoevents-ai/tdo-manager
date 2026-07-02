import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { InventarioDialog } from "@/components/inventario/InventarioDialog";
import { InventarioGrid } from "@/components/inventario/InventarioGrid";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getInventario, getReservas } from "@/lib/data";
import type { Inventario, Reserva } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let items: Inventario[];
  let reservas: Reserva[];
  try {
    [items, reservas] = await Promise.all([getInventario(), getReservas()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="inventario">Tu catálogo de material y atrezzo: stock, disponibilidad por fechas y las reservas de cada evento.</InfoNote>
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{items.length} artículos</Overline>
        <div className="flex items-center gap-2">
          <Link
            href="/inventario/roi"
            className="inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong bg-white px-3 py-2 text-[12.5px] font-semibold text-sage hover:bg-sage-tint"
          >
            <TrendingUp size={15} /> Rentabilidad (ROI)
          </Link>
          <InventarioDialog />
        </div>
      </div>
      <InventarioGrid items={items} reservas={reservas} />
    </div>
  );
}
