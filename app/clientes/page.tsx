import Link from "next/link";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ClienteDialog } from "@/components/clientes/ClienteDialog";
import { CanalBadge } from "@/components/clientes/CanalIcon";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getClientes, getOportunidades } from "@/lib/data";
import { CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

function etapa(c: Cliente): string {
  return c.origen === "cliente_previo" ? "Etapa Cristina" : "Nueva etapa";
}

// Línea secundaria bajo el nombre: tipo · dirección · localidad (sin repetir
// la localidad si la dirección ya la incluye).
function subLinea(c: Cliente): string {
  const loc =
    c.localidad && !(c.direccion ?? "").toLowerCase().includes(c.localidad.toLowerCase())
      ? c.localidad
      : null;
  return [CLIENTE_TIPO_LABEL[c.tipo] ?? c.tipo, c.direccion, loc].filter(Boolean).join(" · ");
}

// Año · Trimestre del último evento del cliente.
function actividad(fechas: Record<string, string>, id: string): string {
  const f = fechas[id];
  if (!f) return "—";
  const d = new Date(f);
  if (isNaN(d.getTime())) return "—";
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} · T${q}`;
}

export default async function ClientesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let clientes: Cliente[];
  let ultimaFecha: Record<string, string> = {};
  try {
    const [cls, ops] = await Promise.all([getClientes(), getOportunidades()]);
    clientes = cls;
    // Última fecha de evento por cliente
    for (const o of ops) {
      if (o.cliente_id && o.fecha_evento) {
        const prev = ultimaFecha[o.cliente_id];
        if (!prev || o.fecha_evento > prev) ultimaFecha[o.cliente_id] = o.fecha_evento;
      }
    }
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="clientes">Tu agenda de clientes y leads: por qué canal llegan, en qué etapa están y su última actividad.</InfoNote>
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{clientes.length} clientes</Overline>
        <ClienteDialog />
      </div>

      {/* Tabla en escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nombre", "NIF / CIF", "Contacto", "Canal", "Estado", "Etapa", "Actividad", ""].map((h) => (
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
                  <Link href={`/clientes/${c.id}`} className="hover:text-clay">
                    {c.nombre}
                  </Link>
                  <div className="mt-0.5 max-w-[300px] truncate text-[11px] font-normal text-ink-muted">
                    {subLinea(c)}
                  </div>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] tabular text-ink-secondary">
                  {c.nif_cif ?? <span className="text-ink-muted">—</span>}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">
                  {c.email || c.telefono ? (
                    <div className="flex flex-col gap-1">
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex max-w-[200px] items-center gap-1.5 hover:text-clay"
                        >
                          <Mail size={12} className="shrink-0 text-ink-muted" />
                          <span className="truncate">{c.email}</span>
                        </a>
                      )}
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-1.5 tabular hover:text-clay">
                          <Phone size={12} className="shrink-0 text-ink-muted" />
                          {c.telefono}
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  {c.canal ? (
                    <CanalBadge canal={c.canal} />
                  ) : (
                    <span className="text-[13px] text-ink-muted">—</span>
                  )}
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={c.estado === "cliente" ? "ok" : "neutral"}>
                    {c.estado === "cliente" ? "Cliente" : "Lead"}
                  </Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={c.origen === "cliente_previo" ? "clay" : "sage"}>{etapa(c)}</Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] tabular text-ink-secondary">
                  {actividad(ultimaFecha, c.id)}
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
              <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[14px] font-semibold">
                  {c.nombre} <ChevronRight size={14} className="text-ink-muted" />
                </div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {CLIENTE_TIPO_LABEL[c.tipo] ?? c.tipo}
                  {c.nif_cif ? ` · ${c.nif_cif}` : ""}
                  {c.localidad ? ` · ${c.localidad}` : ""}
                </div>
                {(c.email || c.telefono) && (
                  <div className="mt-0.5 truncate text-[12px] text-ink-muted">
                    {[c.email, c.telefono].filter(Boolean).join(" · ")}
                  </div>
                )}
              </Link>
              <ClienteDialog cliente={c} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {c.canal && <CanalBadge canal={c.canal} />}
              <Badge tone={c.estado === "cliente" ? "ok" : "neutral"}>
                {c.estado === "cliente" ? "Cliente" : "Lead"}
              </Badge>
              <Badge tone={c.origen === "cliente_previo" ? "clay" : "sage"}>{etapa(c)}</Badge>
              <span className="ml-auto text-[11px] tabular text-ink-muted">
                {actividad(ultimaFecha, c.id)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
