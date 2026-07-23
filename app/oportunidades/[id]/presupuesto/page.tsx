import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { DescargarPdfBtn } from "@/components/presupuesto/DescargarPdfBtn";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad, getVersionPresupuesto } from "@/lib/data";
import { calcularTotales, importeLinea, resumenModalidades } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";
import { EMPRESA, condicionesPara, PORTADA_CANDIDATAS, PORTADA_RESPALDO } from "@/lib/empresa";
import { portadaUrl } from "@/lib/catalogo";
import { PortadaDoc } from "@/components/PortadaDoc";
import { TIPO_EVENTO_LABEL, CLIENTE_TIPO_LABEL } from "@/lib/estados";
import type { PresupuestoLinea } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ v?: string }>;
}) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const { v } = (await searchParams) ?? {};
  const op = await getOportunidad(id);
  if (!op) notFound();

  // ?v=<id> pinta una versión guardada (V1, V2…) en vez del presupuesto vivo.
  const version = v ? await getVersionPresupuesto(v) : null;
  if (v && (!version || version.oportunidad_id !== op.id)) notFound();

  const lineas: PresupuestoLinea[] = version
    ? version.lineas.map((l, i) => ({
        id: String(i),
        oportunidad_id: op.id,
        concepto: l.concepto,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        orden: i,
        bloque: l.bloque ?? null,
        via: l.via ?? "factura",
        foto: l.foto ?? null,
        descuento_pct: l.descuento_pct ?? null,
      }))
    : op.presupuesto_lineas ?? [];
  const ivaPct = version ? Number(version.iva_pct) : op.iva_pct;
  const retPct = version ? Number(version.retencion_pct) : op.retencion_pct;
  const dtoPct = version ? Number(version.descuento_pct ?? 0) : op.descuento_pct ?? 0;
  const t = calcularTotales(lineas, ivaPct, retPct, dtoPct);
  const cli = op.cliente;
  const esAlquiler = op.serie === "alquiler_encargo";
  const esEncargo = esAlquiler && (op.es_encargo ?? false);
  const esAmigos = op.tipo_operacion === "amigos_prestamo";
  const docLabel = esAmigos ? "NOTA (AMIGOS)" : "PRESUPUESTO";

  // El presupuesto enseña el trato COMPLETO, líneas en efectivo incluidas
  // (con su marca "sin IVA" y el desglose en los totales). La factura es la
  // que nunca enseña el efectivo al cliente.
  const lineasDoc = lineas;
  const totalDoc = t.total;

  // Modalidades: opciones excluyentes (el cliente elige una). Si las hay, la
  // agrupación de nivel superior va por opción (común + cada opción), no por
  // bloque; y el "total" se convierte en un precio por opción.
  const resumen = resumenModalidades(lineasDoc, ivaPct, retPct, dtoPct);
  const hayModalidades = resumen.hay;

  type Grupo = { nombre: string | null; lineas: typeof lineas; comun?: boolean; opcion?: boolean };
  const grupos: Grupo[] = [];
  if (hayModalidades) {
    const comunes = lineasDoc.filter((l) => !(l.modalidad ?? "").trim());
    if (comunes.length) grupos.push({ nombre: null, lineas: comunes, comun: true });
    for (const o of resumen.opciones) {
      const suyas = lineasDoc.filter((l) => (l.modalidad ?? "").trim() === o.nombre);
      grupos.push({ nombre: o.nombre, lineas: suyas, opcion: true });
    }
  } else {
    // Agrupación por bloques (en orden de aparición). Sin bloques → tabla plana.
    for (const l of lineasDoc) {
      const nombre = l.bloque ?? null;
      const g = grupos.find((x) => x.nombre === nombre);
      if (g) g.lineas.push(l);
      else grupos.push({ nombre, lineas: [l] });
    }
  }
  const hayBloques = !hayModalidades && grupos.some((g) => g.nombre);
  const mostrarGrupos = hayBloques || hayModalidades;

  // Descuentos: hay columna de Dto si alguna línea lo lleva; el descuento total
  // (líneas + global) se menciona al final. importeBruto = precio sin ningún
  // descuento (para calcular lo que se ahorra el cliente).
  const importeBruto = (l: (typeof lineas)[number]) => l.cantidad * l.precio_unitario;
  const descuentoLinea = (l: (typeof lineas)[number]) => importeBruto(l) * ((l.descuento_pct ?? 0) / 100);
  const hayDescLinea = lineasDoc.some((l) => (l.descuento_pct ?? 0) > 0);
  const brutoSinDto = lineasDoc.reduce((s, l) => s + importeBruto(l), 0);
  const descuentoTotal = Math.max(0, brutoSinDto - t.base);
  const nCols = hayDescLinea ? 5 : 4;

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
            href={`/oportunidades/${op.id}?tab=presupuesto`}
            className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
          >
            <Pencil size={15} /> Editar a mano
          </Link>
          <DescargarPdfBtn oportunidadId={op.id} versionId={version ? v : null} />
          <PrintButton />
        </div>
      </div>

      {version && (
        <div className="no-print rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-[15px] py-[10px] text-[12.5px] text-[#7a5a1a]">
          Estás viendo la <b>V{version.version}</b> guardada el {fecha(version.created_at)}
          {version.notas ? ` («${version.notas}»)` : ""}. El presupuesto actual puede ser distinto.
        </div>
      )}

      {/* Aviso de modo (solo pantalla): para cazar de un vistazo si el
          presupuesto sale como alquiler o como venta antes de enviarlo. */}
      {esAlquiler && (
        <div className="no-print rounded-md border-hair border-clay/40 bg-clay-tint px-[15px] py-[10px] text-[12.5px] text-clay-600">
          Este presupuesto se emitirá como{" "}
          <b>{esEncargo ? "VENTA / ENCARGO" : "ALQUILER"}</b>
          {esEncargo
            ? " — fabricación a medida que se queda el cliente (sin fianza ni devolución)."
            : " — préstamo de material con entrega, recogida y fianza."}{" "}
          Si no es correcto, cámbialo en <b>Editar → ¿Alquiler o venta?</b>
        </div>
      )}

      {/* Documento */}
      <div className="print-doc rounded-lg border-hair border-border bg-white p-8 shadow-sm md:p-12">
        {/* Cabecera */}
        <div className="avoid-break flex items-start justify-between gap-6 border-b-2 border-sage pb-6">
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
              {version && <span className="font-semibold"> · V{version.version}</span>}
            </div>
            <div className="text-[12px] text-ink-secondary">
              Fecha: {fecha(version ? version.created_at : op.fecha_entrada ?? op.created_at)}
            </div>
            {op.fecha_evento && (
              <div className="text-[12px] text-ink-secondary">
                {esEncargo ? "Entrega" : esAlquiler ? "Alquiler" : "Evento"}: {fecha(op.fecha_evento)}
              </div>
            )}
          </div>
        </div>

        {/* Portada: un montaje real de TDO en todos los presupuestos. Se
            prueban varios nombres del bucket y, si ninguno carga, la banda. */}
        <div className="mt-6 overflow-hidden rounded-md">
          <PortadaDoc
            srcs={[
              ...PORTADA_CANDIDATAS.map((c) => portadaUrl(c)).filter((u): u is string => Boolean(u)),
              PORTADA_RESPALDO,
            ]}
            alt={`Montaje de ${EMPRESA.nombre}`}
          />
        </div>

        {/* Cliente + evento */}
        <div className="avoid-break mt-6 grid grid-cols-2 gap-6 text-[12.5px]">
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
              {hayDescLinea && <th className="border-b border-border px-3 py-2 text-right font-semibold">Dto.</th>}
              <th className="border-b border-border px-3 py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineasDoc.length === 0 && (
              <tr>
                <td colSpan={nCols} className="px-3 py-4 text-center text-ink-muted">
                  Sin líneas de presupuesto todavía.
                </td>
              </tr>
            )}
            {grupos.map((g, gi) => (
              <Fragment key={gi}>
                {mostrarGrupos && (
                  <tr>
                    <td colSpan={nCols} className="border-b border-[#f0eae1] px-3 pb-1 pt-4">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-clay">
                        {g.comun
                          ? "Incluido en todas las opciones"
                          : g.opcion
                            ? `Opción · ${g.nombre}`
                            : g.nombre
                              ? `Bloque ${gi + 1} · ${g.nombre}`
                              : "Otros conceptos"}
                      </span>
                    </td>
                  </tr>
                )}
                {g.lineas.map((l) => (
                  <tr key={l.id}>
                    <td className="border-b border-[#f0eae1] px-3 py-2">
                      <span className="flex items-center gap-2.5">
                        {portadaUrl(l.foto ?? null) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={portadaUrl(l.foto ?? null)!}
                            alt=""
                            className="h-[96px] w-[96px] shrink-0 rounded-md object-cover"
                          />
                        )}
                        <span>
                          {l.concepto}
                          {!esAmigos && l.via === "efectivo" && (
                            <span className="ml-1 text-[10.5px] text-ink-muted">(sin IVA)</span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">{l.cantidad}</td>
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                      {eur(l.precio_unitario)}
                    </td>
                    {hayDescLinea && (
                      <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                        {(l.descuento_pct ?? 0) > 0 ? (
                          <>
                            <span className="text-clay">−{eur(descuentoLinea(l))}</span>
                            <span className="ml-1 text-[10px] text-ink-muted">({num(l.descuento_pct ?? 0, 0)}%)</span>
                          </>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    )}
                    <td className="border-b border-[#f0eae1] px-3 py-2 text-right tabular">
                      {eur(importeLinea(l))}
                    </td>
                  </tr>
                ))}
                {mostrarGrupos && (
                  <tr>
                    <td colSpan={nCols - 1} className="border-b border-border bg-beige-light px-3 py-1.5 text-right text-[11px] text-ink-muted">
                      {g.comun
                        ? "Subtotal común (va en todas las opciones)"
                        : g.opcion
                          ? `Subtotal opción ${g.nombre}`
                          : `Subtotal ${g.nombre ?? "otros conceptos"}`}
                    </td>
                    <td className="border-b border-border bg-beige-light px-3 py-1.5 text-right tabular text-[12px] font-semibold">
                      {eur(g.lineas.reduce((s, l) => s + importeLinea(l), 0))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="avoid-break mt-4 flex justify-end">
          <div className="w-full max-w-[300px] space-y-1.5 text-[13px]">
            {hayModalidades ? (
              <>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  Elige una opción
                </div>
                {resumen.opciones.map((o) => (
                  <div
                    key={o.nombre}
                    className="flex items-center justify-between border-t-2 border-sage pt-2 font-display text-[18px] text-sage"
                  >
                    <span>{o.nombre}</span>
                    <span className="tabular">{eur(o.total)}</span>
                  </div>
                ))}
                <p className="pt-1 text-[10.5px] leading-snug text-ink-muted">
                  Cada opción incluye lo común. Precios con IVA ({ivaPct}%)
                  {t.retencion > 0 ? " y retención aplicada" : ""}.
                </p>
              </>
            ) : (
              <>
                {descuentoTotal > 0 && (
                  <>
                    <Row label="Subtotal (sin descuento)" value={eur(brutoSinDto)} />
                    <div className="flex justify-between font-semibold text-clay">
                      <span>Descuento{dtoPct > 0 ? ` (incl. −${num(dtoPct, 0)}% global)` : ""}</span>
                      <span className="tabular">−{eur(descuentoTotal)}</span>
                    </div>
                  </>
                )}
                <Row label="Base imponible" value={eur(esAmigos ? t.base : t.baseFactura)} />
                <Row label={`IVA (${ivaPct}%)`} value={eur(t.iva)} />
                {t.retencion > 0 && <Row label={`Retención IRPF (−${retPct}%)`} value={`−${eur(t.retencion)}`} />}
                {!esAmigos && t.efectivo > 0 && (
                  <>
                    <Row label="Total con factura" value={eur(t.totalFactura)} />
                    <Row label="Conceptos sin IVA" value={eur(t.efectivo)} />
                  </>
                )}
                <div className="flex justify-between border-t-2 border-sage pt-2 font-display text-[19px] text-sage">
                  <span>TOTAL</span>
                  <span className="tabular">{eur(totalDoc)}</span>
                </div>
                {descuentoTotal > 0 && (
                  <div className="mt-1 rounded-sm bg-clay-tint/50 px-2.5 py-1.5 text-center text-[11.5px] font-semibold text-clay-600">
                    Incluye un descuento de {eur(descuentoTotal)}
                  </div>
                )}
              </>
            )}
            {(op.fianza ?? 0) > 0 && (
              <div className="flex justify-between pt-1 text-[12px] text-clay">
                <span>Fianza (reembolsable)</span>
                <span className="tabular font-semibold">{eur(op.fianza ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Condiciones + pago */}
        <div className="avoid-break mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-secondary">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Condiciones</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {condicionesPara(op.serie, esEncargo).map((c, i) => (
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
