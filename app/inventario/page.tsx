import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { InventarioDialog, ESTADO_INV } from "@/components/inventario/InventarioDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getInventario } from "@/lib/data";
import { eur } from "@/lib/format";
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const est = ESTADO_INV[it.estado] ?? { label: it.estado, tone: "neutral" as const };
          return (
            <Card key={it.id} className="flex flex-col p-0">
              {/* Foto */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-beige-warm">
                {it.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.foto_url} alt={it.articulo} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-[13px] text-ink-muted">
                    Sin foto
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge tone={est.tone}>{est.label}</Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold">{it.articulo}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-muted">{it.categoria ?? "—"}</div>
                  </div>
                  <InventarioDialog articulo={it} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <div className="text-ink-muted">Stock</div>
                    <div className="font-semibold">{it.cantidad_total ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">Alquiler</div>
                    <div className="font-semibold tabular">
                      {it.precio_alquiler != null ? eur(it.precio_alquiler) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
                  {it.fianza_especial && (
                    <Badge tone="clay">
                      Fianza{it.fianza_sugerida != null ? ` ${eur(it.fianza_sugerida)}` : ""}
                    </Badge>
                  )}
                  {it.ubicacion && <span className="text-ink-muted">📍 {it.ubicacion}</span>}
                </div>
                {it.notas && <p className="mt-2 text-[11px] text-ink-muted">{it.notas}</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
