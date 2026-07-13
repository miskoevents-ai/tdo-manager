import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad, getReservas, getInventario } from "@/lib/data";
import { eur, fecha } from "@/lib/format";
import { EMPRESA, PORTADA_CANDIDATAS, PORTADA_RESPALDO } from "@/lib/empresa";
import { portadaUrl } from "@/lib/catalogo";
import { PortadaDoc } from "@/components/PortadaDoc";

export const dynamic = "force-dynamic";

// Nota de préstamo para operaciones de amigos: sin IVA, con el material
// entregado, su valor de reposición, la aportación acordada, la fianza y
// firmas. Deja constancia por escrito de qué se llevó cada uno y hasta cuándo.

const CONDICIONES_PRESTAMO = [
  "El material se entrega en buen estado y debe devolverse en las mismas condiciones y en la fecha acordada.",
  "En caso de pérdida, rotura o daño, el prestatario abonará el valor de reposición indicado para cada artículo.",
  "La fianza (si la hay) se devuelve íntegra al retornar todo el material en buen estado.",
  "Operación de préstamo entre particulares/amigos: este documento no es una factura y no lleva IVA.",
];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const [op, reservas, inventario] = await Promise.all([
    getOportunidad(id),
    getReservas(),
    getInventario(),
  ]);
  if (!op) notFound();

  const lineas = op.presupuesto_lineas ?? [];
  const aportacion = lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  const cli = op.cliente;

  // Material prestado, con valor de reposición desde el inventario.
  const porId = new Map(inventario.map((i) => [i.id, i]));
  const material = reservas
    .filter((r) => r.oportunidad_id === id)
    .map((r) => {
      const art = r.articulo_id ? porId.get(r.articulo_id) : undefined;
      const valorUnit = art?.coste_unitario ?? art?.precio_alquiler ?? null;
      return {
        id: r.id,
        nombre: art?.articulo ?? r.articulo?.articulo ?? "Artículo",
        cantidad: r.cantidad,
        salida: r.fecha_salida,
        devolucion: r.fecha_devolucion,
        valorUnit,
        valorTotal: valorUnit != null ? valorUnit * r.cantidad : null,
      };
    });
  const valorReposicion = material.reduce((s, m) => s + (m.valorTotal ?? 0), 0);
  const salida = material.find((m) => m.salida)?.salida ?? op.fecha_montaje ?? op.fecha_evento;
  const devolucion = material.find((m) => m.devolucion)?.devolucion ?? op.fecha_recogida;

  return (
    <div className="print-page mx-auto max-w-[820px] space-y-4">
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
            href={`/oportunidades/${op.id}?tab=material`}
            className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
          >
            <Pencil size={15} /> Editar material
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Documento */}
      <div className="print-doc rounded-lg border-hair border-border bg-white p-8 shadow-sm md:p-12">
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
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[24px] leading-tight text-sage">NOTA DE PRÉSTAMO</div>
            <div className="mt-2 text-[12px] text-ink-secondary">
              Nº <span className="font-semibold">{op.numero}</span>
            </div>
            <div className="text-[12px] text-ink-secondary">Fecha: {fecha(op.fecha_entrada ?? op.created_at)}</div>
            {salida && <div className="text-[12px] text-ink-secondary">Entrega: {fecha(salida)}</div>}
            {devolucion && (
              <div className="text-[12px] font-semibold text-clay">Devolución: {fecha(devolucion)}</div>
            )}
          </div>
        </div>

        {/* Portada: un montaje real de TDO, como en los presupuestos */}
        <div className="mt-6 overflow-hidden rounded-md">
          <PortadaDoc
            srcs={[
              ...PORTADA_CANDIDATAS.map((c) => portadaUrl(c)).filter((u): u is string => Boolean(u)),
              PORTADA_RESPALDO,
            ]}
            alt={`Montaje de ${EMPRESA.nombre}`}
          />
        </div>

        {/* Prestatario + detalle */}
        <div className="mt-6 grid grid-cols-2 gap-6 text-[12.5px]">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Recibe el material
            </div>
            <div className="font-semibold">{cli?.nombre ?? "—"}</div>
            {cli?.nif_cif && <div className="text-ink-secondary">DNI/NIF: {cli.nif_cif}</div>}
            {cli?.telefono && <div className="text-ink-secondary">{cli.telefono}</div>}
            {cli?.email && <div className="text-ink-secondary">{cli.email}</div>}
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Detalle</div>
            <div className="font-semibold">{op.titulo}</div>
            {op.lugar?.nombre && <div className="text-ink-secondary">Lugar: {op.lugar.nombre}</div>}
            {op.notas && <div className="text-ink-secondary">{op.notas}</div>}
          </div>
        </div>

        {/* Material prestado */}
        <table className="mt-6 w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-beige-warm text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Material prestado</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Cant.</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Valor reposición ud.</th>
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {material.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-ink-muted">
                  Sin material reservado — añádelo en la ficha → pestaña Material.
                </td>
              </tr>
            )}
            {material.map((m) => (
              <tr key={m.id}>
                <td className="border-b border-[#f0eae1] px-3 py-2">{m.nombre}</td>
                <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{m.cantidad}</td>
                <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                  {m.valorUnit != null ? eur(m.valorUnit) : "—"}
                </td>
                <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                  {m.valorTotal != null ? eur(m.valorTotal) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          {valorReposicion > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-[11.5px] text-ink-muted">
                  Valor total de reposición del material
                </td>
                <td className="px-3 py-2 text-right tabular font-semibold">{eur(valorReposicion)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Aportación + fianza (sin IVA) */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[300px] space-y-1.5 text-[13px]">
            <div className="flex justify-between border-t-2 border-sage pt-2 font-display text-[18px] text-sage">
              <span>Aportación acordada</span>
              <span className="tabular">{eur(aportacion)}</span>
            </div>
            <div className="text-right text-[10.5px] text-ink-muted">Operación entre amigos · sin IVA</div>
            {(op.fianza ?? 0) > 0 && (
              <div className="flex justify-between rounded-md bg-clay-tint px-3 py-2 text-[13px] text-clay-600">
                <span className="font-semibold">Fianza (reembolsable)</span>
                <span className="tabular font-semibold">{eur(op.fianza ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Condiciones */}
        <div className="mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-secondary">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Condiciones</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {CONDICIONES_PRESTAMO.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        {/* Firmas */}
        <div className="mt-10 grid grid-cols-2 gap-10 text-[11.5px] text-ink-secondary">
          <div>
            <div className="h-16 border-b border-ink" />
            <div className="mt-1.5 font-semibold text-ink">Por {EMPRESA.nombre}</div>
            <div>Nombre y fecha</div>
          </div>
          <div>
            <div className="h-16 border-b border-ink" />
            <div className="mt-1.5 font-semibold text-ink">El prestatario</div>
            <div>Nombre, DNI y fecha</div>
          </div>
        </div>

        <div className="mt-8 text-center font-display text-[13px] text-sage">
          ¡Gracias por cuidar nuestras cositas! 💚
        </div>
      </div>
    </div>
  );
}
