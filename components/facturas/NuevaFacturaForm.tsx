"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { crearFactura } from "@/app/actions";
import { calcularTotales, importeLinea } from "@/lib/calc";
import { eur, num } from "@/lib/format";

type ClienteLite = {
  id: string;
  nombre: string;
  tipo: string;
  nif_cif: string | null;
};

type Linea = { concepto: string; cantidad: number; precio_unitario: number; via: string; descuento_pct?: number | null };

// Presupuesto de partida: precarga cliente, líneas e impuestos de una
// oportunidad para facturar sin re-teclear (todo sigue siendo editable).
export type PresupuestoOrigen = {
  oportunidadId: string;
  numero: string | null;
  titulo: string;
  clienteId: string | null;
  clienteNombre: string | null;
  ivaPct: number;
  retPct: number;
  descuentoPct: number | null;
  total: number;
  lineas: Linea[];
};

const LINEA_VACIA: Linea = { concepto: "", cantidad: 1, precio_unitario: 0, via: "factura" };

// Herramienta para crear una factura a mano, sin pasar por una oportunidad.
// Las líneas con vía "efectivo" no salen en el documento del cliente: quedan
// como parte interna y van a la contabilidad de amigos.
export function NuevaFacturaForm({
  clientes,
  presupuestos,
  numeroSugerido,
  hoy,
}: {
  clientes: ClienteLite[];
  presupuestos: PresupuestoOrigen[];
  numeroSugerido: string;
  hoy: string;
}) {
  const router = useRouter();
  const [origenId, setOrigenId] = React.useState("");
  const [clienteId, setClienteId] = React.useState("");
  const nuevoCliente = clienteId === "__nuevo__";
  const [nc, setNc] = React.useState({
    nombre: "",
    tipo: "particular",
    nif: "",
    direccion: "",
    localidad: "",
    email: "",
  });
  const [numero, setNumero] = React.useState("");
  const [fechaEmision, setFechaEmision] = React.useState(hoy);
  const [fechaVencimiento, setFechaVencimiento] = React.useState("");
  const [iva, setIva] = React.useState(21);
  const [ret, setRet] = React.useState(0);
  const [dto, setDto] = React.useState(0);
  const [lineas, setLineas] = React.useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [cobradaFactura, setCobradaFactura] = React.useState(false);
  const [cobradoEfectivo, setCobradoEfectivo] = React.useState(false);
  const [notas, setNotas] = React.useState("");
  // Datos fiscales completados a mano para un cliente existente sin NIF.
  const [fiscal, setFiscal] = React.useState({ nif: "", direccion: "", localidad: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const t = calcularTotales(lineas, iva, ret, dto);

  const clienteSel = clientes.find((c) => c.id === clienteId);
  const esEmpresa = nuevoCliente ? nc.tipo === "empresa" : clienteSel?.tipo === "empresa";
  const faltaNif = Boolean(clienteSel) && !clienteSel?.nif_cif;

  function setLinea(i: number, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // Precarga desde un presupuesto: cliente, líneas (con su vía) e impuestos.
  function cargarPresupuesto(id: string) {
    setOrigenId(id);
    const p = presupuestos.find((x) => x.oportunidadId === id);
    if (!p) return;
    setClienteId(p.clienteId ?? "");
    setIva(p.ivaPct);
    setRet(p.retPct);
    setDto(p.descuentoPct ?? 0);
    setLineas(p.lineas.length ? p.lineas.map((l) => ({ ...l })) : [{ ...LINEA_VACIA }]);
  }

  async function guardar() {
    setBusy(true);
    setError(null);
    try {
      const id = await crearFactura({
        clienteId: nuevoCliente ? null : clienteId || null,
        nuevoCliente: nuevoCliente ? nc : null,
        fiscalPatch: !nuevoCliente && faltaNif ? fiscal : null,
        oportunidadId: origenId || null,
        numero: numero.trim() || null,
        fechaEmision,
        fechaVencimiento: fechaVencimiento || null,
        ivaPct: iva,
        retPct: ret,
        descuentoPct: dto || null,
        lineas,
        cobradaFactura,
        cobradoEfectivo,
        notas: notas || null,
      });
      router.push(`/facturas/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Punto de partida: un presupuesto ya preparado */}
      {presupuestos.length > 0 && (
        <Card>
          <Overline className="!mt-0 mb-3">Partir de un presupuesto</Overline>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Presupuesto de origen (opcional)">
              <Select value={origenId} onChange={(e) => cargarPresupuesto(e.target.value)}>
                <option value="">— Empezar de cero —</option>
                {presupuestos.map((p) => (
                  <option key={p.oportunidadId} value={p.oportunidadId}>
                    {p.numero ?? "s/n"} · {p.titulo}
                    {p.clienteNombre ? ` · ${p.clienteNombre}` : ""} · {eur(p.total)}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="self-end pb-2 text-[11.5px] text-ink-muted">
              Precarga cliente, líneas (con su vía) e impuestos del presupuesto enviado. Luego
              puedes editar lo que haga falta.
            </p>
          </div>
        </Card>
      )}

      {/* Cliente y datos fiscales */}
      <Card>
        <Overline className="!mt-0 mb-3">Cliente</Overline>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">— Elegir cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.nif_cif ? ` · ${c.nif_cif}` : ""}
                </option>
              ))}
              <option value="__nuevo__">➕ Nuevo cliente…</option>
            </Select>
          </Field>
        </div>
        {faltaNif && (
          <div className="mt-3 rounded-md border-hair border-[#e7d3a6] bg-warn-tint p-4">
            <p className="mb-2 text-[11.5px] font-semibold text-[#7a5a1a]">
              A este cliente le faltan los datos fiscales — complétalos aquí y se guardan en su
              ficha:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="NIF / CIF">
                <Input value={fiscal.nif} onChange={(e) => setFiscal({ ...fiscal, nif: e.target.value })} placeholder="B12345678" />
              </Field>
              <Field label="Dirección">
                <Input value={fiscal.direccion} onChange={(e) => setFiscal({ ...fiscal, direccion: e.target.value })} />
              </Field>
              <Field label="Localidad">
                <Input value={fiscal.localidad} onChange={(e) => setFiscal({ ...fiscal, localidad: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
        {nuevoCliente && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4 sm:grid-cols-3">
            <Field label="Nombre / Razón social">
              <Input value={nc.nombre} onChange={(e) => setNc({ ...nc, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Tipo">
              <Select value={nc.tipo} onChange={(e) => setNc({ ...nc, tipo: e.target.value })}>
                <option value="particular">Particular</option>
                <option value="empresa">Empresa</option>
              </Select>
            </Field>
            <Field label="NIF / CIF">
              <Input value={nc.nif} onChange={(e) => setNc({ ...nc, nif: e.target.value })} placeholder="B12345678" />
            </Field>
            <Field label="Dirección">
              <Input value={nc.direccion} onChange={(e) => setNc({ ...nc, direccion: e.target.value })} />
            </Field>
            <Field label="Localidad">
              <Input value={nc.localidad} onChange={(e) => setNc({ ...nc, localidad: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
            </Field>
          </div>
        )}
      </Card>

      {/* Datos de la factura */}
      <Card>
        <Overline className="!mt-0 mb-3">Datos de la factura</Overline>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Número (automático)">
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={numeroSugerido} />
            <p className="mt-1 text-[10.5px] text-ink-muted">
              {numero.trim()
                ? "Forzarás este número a mano."
                : `Se asigna solo: será la ${numeroSugerido}. Escribe solo para forzar otro.`}
            </p>
          </Field>
          <Field label="Fecha de emisión">
            <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
          </Field>
          <Field label="Vencimiento (cuándo se cobra)">
            <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="IVA %">
              <Input
                type="number"
                step="1"
                min="0"
                value={iva || ""}
                onChange={(e) => setIva(Math.round(Number(e.target.value) || 0))}
                className="text-right tabular"
              />
            </Field>
            <Field label="Ret. %">
              <Input
                type="number"
                step="1"
                min="0"
                value={ret || ""}
                onChange={(e) => setRet(Math.round(Number(e.target.value) || 0))}
                className="text-right tabular"
              />
            </Field>
            <Field label="Dto. %">
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={dto || ""}
                onChange={(e) => setDto(Math.min(100, Number(e.target.value) || 0))}
                className="text-right tabular"
              />
            </Field>
          </div>
        </div>
        {esEmpresa && ret === 0 && (
          <p className="mt-2 text-[11.5px] text-ink-muted">
            Cliente empresa → normalmente lleva retención del −15%.{" "}
            <button className="font-semibold text-clay underline" onClick={() => setRet(15)}>
              Aplicar −15%
            </button>
          </p>
        )}
      </Card>

      {/* Líneas */}
      <Card>
        <Overline className="!mt-0 mb-3">Líneas</Overline>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
                <th className="border-b border-border py-2 text-left font-semibold">Concepto</th>
                <th className="w-[70px] border-b border-border py-2 text-right font-semibold">Cant.</th>
                <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Precio €</th>
                <th className="w-[64px] border-b border-border py-2 text-right font-semibold">Dto %</th>
                <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Subtotal</th>
                <th className="w-[96px] border-b border-border py-2 pl-2 text-left font-semibold">Vía</th>
                <th className="w-[36px] border-b border-border py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                    <Input
                      value={l.concepto}
                      onChange={(e) => setLinea(i, { concepto: e.target.value })}
                      placeholder="Descripción del concepto"
                      className="py-2 text-[13px]"
                    />
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={l.cantidad || ""}
                      onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })}
                      className="py-2 text-right text-[13px] tabular"
                    />
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={l.precio_unitario || ""}
                      onChange={(e) => setLinea(i, { precio_unitario: Number(e.target.value) })}
                      className="py-2 text-right text-[13px] tabular"
                    />
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={l.descuento_pct || ""}
                      onChange={(e) => setLinea(i, { descuento_pct: Math.min(100, Number(e.target.value) || 0) || null })}
                      placeholder="—"
                      className="py-2 text-right text-[12px] tabular"
                    />
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-right text-[13px] tabular font-semibold">
                    {eur(importeLinea(l))}
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                    <select
                      value={l.via}
                      onChange={(e) => setLinea(i, { via: e.target.value })}
                      title="Con factura (IVA) o efectivo (sin IVA, no sale en el documento del cliente)"
                      className={`w-full rounded-sm border-med border-border bg-white px-1.5 py-2 text-[11.5px] focus:outline-none ${
                        l.via === "efectivo" ? "font-semibold text-clay" : "text-ink-secondary"
                      }`}
                    >
                      <option value="factura">Factura</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-center">
                    <button
                      onClick={() => setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))}
                      className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                      aria-label="Eliminar línea"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <Button variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { ...LINEA_VACIA }])}>
            <Plus size={14} /> Añadir línea
          </Button>
          <div className="w-full md:w-[300px]">
            {t.descuento > 0 && (
              <>
                <div className="flex justify-between border-t border-border py-2 text-[13px]">
                  <span className="text-ink-secondary">Suma de las líneas</span>
                  <span className="tabular">{eur(t.bruto)}</span>
                </div>
                <div className="flex justify-between py-1 text-[13px]">
                  <span className="text-clay">Descuento (−{num(dto, 0)}%)</span>
                  <span className="tabular font-semibold text-clay">−{eur(t.descuento)}</span>
                </div>
              </>
            )}
            <div className={`flex justify-between py-2 text-[13px] ${t.descuento > 0 ? "" : "border-t border-border"}`}>
              <span className="text-ink-secondary">{t.efectivo > 0 ? "Base facturable" : "Base imponible"}</span>
              <span className="tabular font-semibold">{eur(t.baseFactura)}</span>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span className="text-ink-secondary">IVA ({num(iva, 0)}%)</span>
              <span className="tabular">{eur(t.iva)}</span>
            </div>
            {ret > 0 && (
              <div className="flex justify-between py-1 text-[13px]">
                <span className="text-ink-secondary">Retención (−{num(ret, 0)}%)</span>
                <span className="tabular text-error">−{eur(t.retencion)}</span>
              </div>
            )}
            {t.efectivo > 0 && (
              <>
                <div className="flex justify-between border-t border-border py-1.5 text-[13px]">
                  <span className="text-ink-secondary">Total factura (lo que ve el cliente)</span>
                  <span className="tabular font-semibold">{eur(t.totalFactura)}</span>
                </div>
                <div className="flex justify-between py-1 text-[13px]">
                  <span className="text-clay">Efectivo sin IVA (solo interno)</span>
                  <span className="tabular font-semibold text-clay">{eur(t.efectivo)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-ink pt-2 text-[14px] font-semibold">
                  <span>Total real a cobrar</span>
                  <span className="tabular">{eur(t.total)}</span>
                </div>
              </>
            )}
            {t.efectivo <= 0 && (
              <div className="flex justify-between border-t-2 border-ink pt-2 font-display text-[17px] font-bold">
                <span>Total</span>
                <span className="tabular">{eur(t.total)}</span>
              </div>
            )}
          </div>
        </div>
        {t.efectivo > 0 && (
          <p className="mt-3 rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-3 py-2 text-[11.5px] text-[#7a5a1a]">
            La parte en efectivo <b>no aparecerá en el documento que ve el cliente</b>: queda
            registrada como parte interna de la factura y su importe entra en la contabilidad de
            amigos (sin IVA).
          </p>
        )}
      </Card>

      {/* Cobro y notas */}
      <Card>
        <Overline className="!mt-0 mb-3">Cobro</Overline>
        <div className="space-y-2 text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cobradaFactura}
              onChange={(e) => setCobradaFactura(e.target.checked)}
              className="h-4 w-4 accent-[#3F4A36]"
            />
            La factura ya está cobrada (si no, queda como cobro previsto en el vencimiento)
          </label>
          {t.efectivo > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cobradoEfectivo}
                onChange={(e) => setCobradoEfectivo(e.target.checked)}
                className="h-4 w-4 accent-[#BE6E4C]"
              />
              El efectivo ya está cobrado (si no, queda como cobro previsto de amigos)
            </label>
          )}
        </div>
        <div className="mt-4">
          <Field label="Notas (salen en el documento)">
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional…" />
          </Field>
        </div>
      </Card>

      {error && <p className="text-caption text-error">{error}</p>}
      <div className="flex items-center gap-2">
        <Button onClick={guardar} disabled={busy}>
          {busy ? "Creando factura…" : "Crear factura"}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/facturas")} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
