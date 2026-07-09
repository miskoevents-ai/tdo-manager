import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha } from "@/lib/format";
import { EMPRESA, CONDICIONES_PRESUPUESTO } from "@/lib/empresa";
import { TIPO_EVENTO_LABEL, CLIENTE_TIPO_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const op = await getOportunidad(id);
  if (!op) notFound();

  const lineas = op.presupuesto_lineas ?? [];
  const t = calcularTotales(
    lineas.map((l) => ({ cantidad: l.cantidad, precio_unitario: l.precio_unitario, via: l.via ?? "factura" })),
    op.iva_pct,
    op.retencion_pct,
  );
  const cli = op.cliente;
  const esAlquiler = op.serie === "alquiler_encargo";
  const docLabel = op.tipo_operacion === "amigos_prestamo" ? "NOTA (AMIGOS)" : "PRESUPUESTO";

  // Agrupación por bloques (en orden de aparición). Sin bloques → tabla plana.
  const grupos: { nombre: string | null; lineas: typeof lineas }[] = [];
  for (const l of lineas) {
    const nombre = l.bloque ?? null;
    const g = grupos.find((x) => x.nombre === nombre);
    if (g) g.lineas.push(l);
    else grupos.push({ nombre, lineas: [l] });
  }
  const hayBloques = grupos.some((g) => g.nombre);

  return (
    <div className="mx-auto max-w-[820px] space-y-4">
      {/* Barra de acciones (no se imprime) */}
      <div className="no-print flex items-center justify-between">
        <Link
          href={`/oportunidades/${op.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage"
        >
          <ArrowLeft size={14} /> Volver a la ficha
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/oportunidades/${op.id}?tab=presupuesto`}
            className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
          >
            <Pencil size={15} /> Editar a mano
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Documento */}
      <div className="print-doc rounded-lg border-hair border-border bg-white p-8 shadow-sm md:p-12">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-sage pb-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image src="/logo-horizontal.png" alt={EMPRESA.nombre} width={200} height={110} className="w-[180px]" />
            <div className="mt-3 text-[11px] leading-relaxed text-ink-secondary">
              {EMPRESA.razon_social && <div>{EMPRESA.razon_social}</div>}
              {EMPRESA.nif && <div>NIF: {EMPRESA.nif}</div>}
              {EMPRESA.direccion && <div>{EMPRESA.direccion}</div>}
              {EMPRESA.telefono && <div>Tel. {EMPRESA.telefono}</div>}
              {EMPRESA.email && <div>{EMPRESA.email}</div>}
              {EMPRESA.web && <div>{EMPRESA.web}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[26px] leading-none text-sage">{docLabel}</div>
            <div className="mt-2 text-[12px] text-ink-secondary">
              Nº <span className="font-semibold">{op.numero}</span>
            </div>
            <div className="text-[12px] text-ink-secondary">Fecha: {fecha(op.fecha_entrada ?? op.created_at)}</div>
            {op.fecha_evento && (
              <div className="text-[12px] text-ink-secondary">
                {esAlquiler ? "Alquiler" : "Evento"}: {fecha(op.fecha_evento)}
              </div>
            )}
          </div>
        </div>

        {/* Cliente + evento */}
        <div className="mt-6 grid grid-cols-2 gap-6 text-[12.5px]">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Cliente</div>
            <div className="font-semibold">{cli?.nombre ?? "—"}</div>
            <div className="text-ink-secondary">
              {cli?.tipo ? CLIENTE_TIPO_LABEL[cli.tipo] ?? cli.tipo : ""}
              {cli?.nif_cif ? ` · NIF ${cli.nif_cif}` : ""}
            </div>
            {cli?.direccion && <div className="text-ink-secondary">{cli.direccion}</div>}
            {cli?.localidad && <div className="text-ink-secondary">{cli.localidad}</div>}
            {cli?.email && <div className="text-ink-secondary">{cli.email}</div>}
            {cli?.telefono && <div className="text-ink-secondary">{cli.telefono}</div>}
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Detalle</div>
            <div className="font-semibold">{op.titulo}</div>
            <div className="text-ink-secondary">{TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento}</div>
            {op.lugar?.nombre && <div className="text-ink-secondary">Lugar: {op.lugar.nombre}</div>}
            {op.n_invitados != null && <div className="text-ink-secondary">Invitados: {op.n_invitados}</div>}
          </div>
        </div>

        {/* Líneas */}
        <table className="mt-6 w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-beige-warm text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Concepto</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Cant.</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Precio</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-ink-muted">
                  Sin líneas de presupuesto todavía.
                </td>
              </tr>
            )}
            {grupos.map((g, gi) => (
              <Fragment key={gi}>
                {hayBloques && (
                  <tr>
                    <td colSpan={4} className="border-b border-[#f0eae1] px-3 pb-1 pt-4">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-clay">
                        {g.nombre ? `Bloque ${gi + 1} · ${g.nombre}` : "Otros conceptos"}
                      </span>
                    </td>
                  </tr>
                )}
                {g.lineas.map((l) => (
                  <tr key={l.id}>
                    <td className="border-b border-[#f0eae1] px-3 py-2">
                      {l.concepto}
                      {l.via === "efectivo" && (
                        <span className="ml-1 text-[10.5px] text-ink-muted">(sin IVA)</span>
                      )}
                    </td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{l.cantidad}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{eur(l.precio_unitario)}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                      {eur(l.cantidad * l.precio_unitario)}
                    </td>
                  </tr>
                ))}
                {hayBloques && (
                  <tr>
                    <td colSpan={3} className="border-b border-border bg-beige-light px-3 py-1.5 text-right text-[11px] text-ink-muted">
                      Subtotal {g.nombre ?? "otros conceptos"}
                    </td>
                    <td className="border-b border-border bg-beige-light px-3 py-1.5 text-right tabular text-[12px] font-semibold">
                      {eur(g.lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[280px] space-y-1.5 text-[13px]">
            <Row label="Base imponible" value={eur(t.baseFactura)} />
            <Row label={`IVA (${op.iva_pct}%)`} value={eur(t.iva)} />
            {t.retencion > 0 && <Row label={`Retención IRPF (−${op.retencion_pct}%)`} value={`−${eur(t.retencion)}`} />}
            {t.efectivo > 0 && (
              <>
                <Row label="Total con factura" value={eur(t.totalFactura)} />
                <Row label="Conceptos sin IVA" value={eur(t.efectivo)} />
              </>
            )}
            <div className="flex justify-between border-t-2 border-sage pt-2 font-display text-[19px] text-sage">
              <span>TOTAL</span>
              <span className="tabular">{eur(t.total)}</span>
            </div>
            {(op.fianza ?? 0) > 0 && (
              <div className="flex justify-between pt-1 text-[12px] text-clay">
                <span>Fianza (reembolsable)</span>
                <span className="tabular font-semibold">{eur(op.fianza ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Condiciones + pago */}
        <div className="mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-secondary">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Condiciones</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {CONDICIONES_PRESUPUESTO.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          {(EMPRESA.iban || EMPRESA.titular_cuenta) && (
            <div className="mt-3">
              <span className="font-semibold text-ink">Pago:</span>{" "}
              {EMPRESA.titular_cuenta && `${EMPRESA.titular_cuenta} · `}
              {EMPRESA.iban || ""}
            </div>
          )}
          <div className="mt-4 text-center font-display text-[13px] text-sage">
            ¡Gracias por confiar en {EMPRESA.nombre}!
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-secondary">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
