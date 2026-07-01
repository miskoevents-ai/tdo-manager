import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { InventarioDialog } from "@/components/inventario/InventarioDialog";
import { InventarioGrid } from "@/components/inventario/InventarioGrid";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getInventario } from "@/lib/data";
import type { Inventario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let items: Inventario[];
  try {
    items = await getInventario();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{items.length} artículos</Overline>
        <InventarioDialog />
      </div>
      <InventarioGrid items={items} />
    </div>
  );
}
