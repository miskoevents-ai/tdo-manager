import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getFactura } from "@/lib/data";
import { eur, fecha, num } from "@/lib/format";
import { EMPRESA } from "@/lib/empresa";
import { CLIENTE_TIPO_LABEL, TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { FacturaLinea } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const f = await getFactura(id);
  if (!f) notFound();

  const cli = f.cliente;
  const op = f.oportunidad;
  const base = Number(f.base_imponible);
  const iva = Number(f.iva);
  const ret = Number(f.retencion);
  // Porcentajes reconstruidos desde los importes congelados de la factura.
  const ivaPct = base > 0 ? Math.round((iva / base) * 100) : 0;
  const retPct = base > 0 ? Math.round((ret / base) * 100) : 0;

  // Líneas: la foto fija guardada al emitir; si la factura es antigua y no la
  // tiene, se usan las líneas del presupuesto; y si tampoco hay, una línea
  // única con la base. Las líneas con vía 'efectivo' son SOLO internas: no
  // salen en el documento del cliente.
  let todas: FacturaLinea[] = Array.isArray(f.lineas) ? f.lineas : [];
  if (todas.length === 0 && op?.presupuesto_lineas?.length) {
    todas = op.presupuesto_lineas
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((l) => ({
        concepto: l.concepto,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        bloque: l.bloque ?? null,
        via: l.via ?? "factura",
      }));
  }
  let lineas = todas.filter((l) => (l.via ?? "factura") !== "efectivo");
  const lineasEfectivo = todas.filter((l) => (l.via ?? "factura") === "efectivo");
  const totalEfectivo = lineasEfectivo.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  if (lineas.length === 0) {
    lineas = [
      {
        concepto: op ? `Servicios de decoración · ${op.titulo}` : "Servicios de decoración",
        cantidad: 1,
        precio_unitario: base,
        bloque: null,
      },
    ];
  }

  // Agrupación por bloques, como en el presupuesto.
  const grupos: { nombre: string | null; lineas: FacturaLinea[] }[] = [];
  for (const l of lineas) {
    const nombre = l.bloque ?? null;
    const g = grupos.find((x) => x.nombre === nombre);
    if (g) g.lineas.push(l);
    else grupos.push({ nombre, lineas: [l] });
  }
  const hayBloques = grupos.some((g) => g.nombre);
  const anulada = f.estado === "anulada";

  return (
    <div className="mx-auto max-w-[820px] space-y-4">
      {/* Barra de acciones (no se imprime) */}
      <div className="no-print flex items-center justify-between">
        <Link
          href="/facturas"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage"
        >
          <ArrowLeft size={14} /> Volver a documentos
        </Link>
        <div className="flex items-center gap-2">
          {op && (
            <Link
              href={`/oportunidades/${op.id}`}
              className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              Ver la oportunidad
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Documento */}
      <div className="print-doc relative rounded-lg border-hair border-border bg-white p-8 shadow-sm md:p-12">
        {anulada && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-18deg] rounded-md border-4 border-error px-8 py-3 font-display text-[42px] tracking-[0.2em] text-error opacity-30">
              ANULADA
            </span>
          </div>
        )}
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-sage pb-6">
          <div>
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
            <div className="font-display text-[26px] leading-none text-sage">FACTURA</div>
            <div className="mt-2 text-[12px] text-ink-secondary">
              Nº <span className="font-semibold">{f.numero}</span>
            </div>
            <div className="text-[12px] text-ink-secondary">Fecha: {fecha(f.fecha_emision)}</div>
            {f.fecha_vencimiento && (
              <div className="text-[12px] text-ink-secondary">Vencimiento: {fecha(f.fecha_vencimiento)}</div>
            )}
          </div>
        </div>

        {/* Cliente + detalle */}
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
          </div>
          {op && (
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Detalle</div>
              <div className="font-semibold">{op.titulo}</div>
              <div className="text-ink-secondary">{TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento}</div>
              {op.fecha_evento && <div className="text-ink-secondary">Fecha del servicio: {fecha(op.fecha_evento)}</div>}
              {op.numero && <div className="text-ink-secondary">Presupuesto Nº {op.numero}</div>}
            </div>
          )}
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
            {grupos.map((g, gi) => (
              <Fragment key={gi}>
                {hayBloques && (
                  <tr>
                    <td colSpan={4} className="border-b border-[#f0eae1] px-3 pb-1 pt-4">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-clay">
                        {g.nombre ?? "Otros conceptos"}
                      </span>
                    </td>
                  </tr>
                )}
                {g.lineas.map((l, i) => (
                  <tr key={i}>
                    <td className="border-b border-[#f0eae1] px-3 py-2">{l.concepto}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{num(l.cantidad, 0)}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{eur(l.precio_unitario)}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                      {eur(l.cantidad * l.precio_unitario)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totales (importes congelados de la factura) */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[280px] space-y-1.5 text-[13px]">
            <Row label="Base imponible" value={eur(base)} />
            <Row label={`IVA (${ivaPct}%)`} value={eur(iva)} />
            {ret > 0 && <Row label={`Retención IRPF (−${retPct}%)`} value={`−${eur(ret)}`} />}
            <div className="flex justify-between border-t-2 border-sage pt-2 font-display text-[19px] text-sage">
              <span>TOTAL</span>
              <span className="tabular">{eur(Number(f.total))}</span>
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-secondary">
          {(EMPRESA.iban || EMPRESA.titular_cuenta) && (
            <div>
              <span className="font-semibold text-ink">Forma de pago:</span> transferencia bancaria
              {f.fecha_vencimiento ? ` antes del ${fecha(f.fecha_vencimiento)}` : ""}.{" "}
              {EMPRESA.titular_cuenta && `${EMPRESA.titular_cuenta} · `}
              {EMPRESA.iban || ""}
            </div>
          )}
          {f.notas && <div className="mt-2">{f.notas}</div>}
          <div className="mt-4 text-center font-display text-[13px] text-sage">
            ¡Gracias por confiar en {EMPRESA.nombre}!
          </div>
        </div>
      </div>

      {/* Parte interna: no sale en el documento ni al imprimir */}
      {lineasEfectivo.length > 0 && (
        <div className="no-print rounded-lg border-2 border-dashed border-clay/50 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-clay">
              🔒 Parte interna — no sale en el documento del cliente
            </div>
            <span className="tabular text-[15px] font-semibold text-clay">{eur(totalEfectivo)}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {lineasEfectivo.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-[12.5px]">
                <span className="text-ink-secondary">
                  {l.concepto} <span className="text-ink-muted">× {num(l.cantidad, 0)}</span>
                </span>
                <span className="tabular">{eur(l.cantidad * l.precio_unitario)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-ink-muted">
            Cobro en efectivo, sin IVA: está en la <b>contabilidad de amigos</b> y en Tesorería,
            pero no computa en la oficial ni aparece al imprimir o guardar el PDF. El total real a
            cobrar del cliente es <b className="tabular">{eur(Number(f.total) + totalEfectivo)}</b>.
          </p>
        </div>
      )}
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
