import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ProveedorDialog, TIPO_SERVICIO_LABEL } from "@/components/proveedores/ProveedorDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getProveedores, getTesoreria, getGastosFijos } from "@/lib/data";
import { eur } from "@/lib/format";
import type { Proveedor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let proveedores: Proveedor[];
  const gastado: Record<string, number> = {};
  const pendiente: Record<string, number> = {};
  const costeFijoMes: Record<string, number> = {};
  try {
    const [provs, teso, gastosFijos] = await Promise.all([getProveedores(), getTesoreria(), getGastosFijos()]);
    proveedores = provs;
    for (const m of teso) {
      if (m.proveedor_id && m.tipo === "gasto") {
        gastado[m.proveedor_id] = (gastado[m.proveedor_id] ?? 0) + Number(m.importe);
        // Pendiente de pagar: gastos aún no pagados (previsto o vencido).
        if (m.estado === "previsto" || m.estado === "vencido") {
          pendiente[m.proveedor_id] = (pendiente[m.proveedor_id] ?? 0) + Number(m.importe);
        }
      }
    }
    // Coste fijo recurrente por proveedor, en euros/mes (normaliza la periodicidad).
    const porMes = (g: { importe_mensual: number; periodicidad: string }) => {
      const imp = Number(g.importe_mensual);
      if (g.periodicidad === "anual") return imp / 12;
      if (g.periodicidad === "trimestral") return imp / 3;
      return imp;
    };
    for (const g of gastosFijos) {
      if (g.activo && g.proveedor_id) {
        costeFijoMes[g.proveedor_id] = (costeFijoMes[g.proveedor_id] ?? 0) + porMes(g);
      }
    }
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="proveedores">Tus proveedores y cuánto llevas gastado y pendiente de pagar con cada uno.</InfoNote>
      <Link href="/tesoreria" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
        <ArrowLeft size={14} /> Tesorería
      </Link>

      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{proveedores.length} proveedores</Overline>
        <ProveedorDialog />
      </div>

      {proveedores.length === 0 ? (
        <Card className="max-w-container-narrow">
          <p className="text-small text-ink-secondary">
            Aún no hay proveedores. Crea el primero con «Nuevo proveedor». Luego, al registrar un
            gasto en Tesorería, podrás enlazarlo a su proveedor y aquí verás el total gastado con
            cada uno.
          </p>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr>
                  {["Nombre", "Servicio", "Contacto", "Localidad", "Total gastado", "Pendiente", ""].map((h) => (
                    <th key={h} className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} className="hover:bg-beige-light">
                    <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                      {p.nombre}
                      {(p.razon_social || p.nif) && (
                        <div className="mt-0.5 text-[11px] font-normal text-ink-muted">
                          {[p.razon_social, p.nif].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {costeFijoMes[p.id] > 0 && (
                        <div className="mt-0.5 text-[11px] font-normal text-sage">🔁 {eur(costeFijoMes[p.id])}/mes fijo</div>
                      )}
                    </td>
                    <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">
                      {p.tipo_servicio ? (TIPO_SERVICIO_LABEL[p.tipo_servicio] ?? p.tipo_servicio) : "—"}
                    </td>
                    <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">
                      {p.contacto ?? p.telefono ?? p.email ?? "—"}
                    </td>
                    <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">{p.localidad ?? "—"}</td>
                    <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">{eur(gastado[p.id] ?? 0)}</td>
                    <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">
                      {pendiente[p.id] ? (
                        <span className="font-semibold text-warn">{eur(pendiente[p.id])}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="border-t border-border px-[15px] py-3 text-right"><ProveedorDialog proveedor={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {proveedores.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[14px] font-semibold">{p.nombre}</div>
                    <div className="mt-0.5 text-[12px] text-ink-muted">
                      {p.tipo_servicio ? (TIPO_SERVICIO_LABEL[p.tipo_servicio] ?? p.tipo_servicio) : "—"}
                      {p.localidad ? ` · ${p.localidad}` : ""}
                    </div>
                    {(p.razon_social || p.nif) && (
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        {[p.razon_social, p.nif].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <ProveedorDialog proveedor={p} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
                  <span>Total gastado: <b className="tabular">{eur(gastado[p.id] ?? 0)}</b></span>
                  {pendiente[p.id] ? (
                    <span>Pendiente: <b className="tabular text-warn">{eur(pendiente[p.id])}</b></span>
                  ) : null}
                  {costeFijoMes[p.id] > 0 ? (
                    <span>Fijo: <b className="tabular text-sage">{eur(costeFijoMes[p.id])}/mes</b></span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
