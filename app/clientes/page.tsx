import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ClienteDialog } from "@/components/clientes/ClienteDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getClientes } from "@/lib/data";
import { CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

function etapa(c: Cliente): string {
  return c.origen === "cliente_previo" ? "Etapa Cristina" : "Nueva etapa";
}

export default async function ClientesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let clientes: Cliente[];
  try {
    clientes = await getClientes();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{clientes.length} clientes</Overline>
        <ClienteDialog />
      </div>

      {/* Tabla en escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nombre", "Tipo", "Localidad", "Estado", "Etapa", ""].map((h) => (
                <th
                  key={h}
                  className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-beige-light">
                <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                  {c.nombre}
                  {c.nif_cif && (
                    <span className="ml-2 text-[11px] text-ink-muted">{c.nif_cif}</span>
                  )}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                  {CLIENTE_TIPO_LABEL[c.tipo] ?? c.tipo}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                  {c.localidad ?? "—"}
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={c.estado === "cliente" ? "ok" : "neutral"}>
                    {c.estado === "cliente" ? "Cliente" : "Lead"}
                  </Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={c.origen === "cliente_previo" ? "clay" : "sage"}>{etapa(c)}</Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-right">
                  <ClienteDialog cliente={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas en móvil */}
      <div className="space-y-3 md:hidden">
        {clientes.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[14px] font-semibold">{c.nombre}</div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {CLIENTE_TIPO_LABEL[c.tipo] ?? c.tipo}
                  {c.localidad ? ` · ${c.localidad}` : ""}
                </div>
              </div>
              <ClienteDialog cliente={c} />
            </div>
            <div className="mt-3 flex gap-2">
              <Badge tone={c.estado === "cliente" ? "ok" : "neutral"}>
                {c.estado === "cliente" ? "Cliente" : "Lead"}
              </Badge>
              <Badge tone={c.origen === "cliente_previo" ? "clay" : "sage"}>{etapa(c)}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
