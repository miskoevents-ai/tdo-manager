"use client";

import * as React from "react";
import { Printer, X, MousePointerClick } from "lucide-react";
import type { CoberturaMes } from "@/lib/cobertura";
import { eur } from "@/lib/format";
import {
  KANBAN_COLS,
  ESTADO_META,
  TIPO_EVENTO_LABEL,
  CANAL_LABEL,
  MOTIVO_PERDIDA_LABEL,
  tipoOperacionLabel,
} from "@/lib/estados";

export type PipeRow = {
  id: string;
  titulo: string;
  estado: string;
  tipoEvento: string;
  serie: string;
  esEncargo: boolean;
  canal: string | null;
  cliente: string | null;
  fechaEvento: string | null;
  fechaEntrada: string | null;
  fechaConfirmacion: string | null;
  motivoPerdida: string | null;
  total: number;
  cobrado: number;
  prob: number; // 0..100
};

const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];
const ABIERTAS = ["nueva", "contestada", "en_conversacion", "presupuesto_enviado"];
const CERRADAS_PERDIDAS = ["perdida", "descartada"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const COLOR_ETAPA: Record<string, string> = {
  nueva: "#8A9576",
  contestada: "#7A876A",
  en_conversacion: "#69775C",
  presupuesto_enviado: "#BE6E4C",
  confirmada: "#5B7A52",
  en_produccion: "#5B7A52",
  realizada: "#5B7A52",
  facturada: "#59654B",
};

function diasEntre(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null;
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

type Detalle = { titulo: string; items: PipeRow[] };

const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function ReportesPipeline({ rows, hoy, termometro = [] }: { rows: PipeRow[]; hoy: string; termometro?: CoberturaMes[] }) {
  const [serie, setSerie] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [periodo, setPeriodo] = React.useState("");
  const [detalle, setDetalle] = React.useState<Detalle | null>(null);
  const abrir = (titulo: string, items: PipeRow[]) => setDetalle({ titulo, items });

  const anoActual = hoy.slice(0, 4);
  const rs = rows.filter((r) => {
    if (serie && r.serie !== serie) return false;
    if (tipo && r.tipoEvento !== tipo) return false;
    if (periodo === "proximos" && !(r.fechaEvento && r.fechaEvento >= hoy)) return false;
    if (periodo === "ano" && (r.fechaEvento ?? "").slice(0, 4) !== anoActual) return false;
    return true;
  });

  const abiertas = rs.filter((r) => ABIERTAS.includes(r.estado));
  const contratadas = rs.filter((r) => CONTRATADAS.includes(r.estado));
  const perdidas = rs.filter((r) => CERRADAS_PERDIDAS.includes(r.estado));
  const pipeAbierto = abiertas.reduce((s, r) => s + r.total, 0);
  const ponderado = abiertas.reduce((s, r) => s + r.total * (r.prob / 100), 0);
  const ganado = contratadas.reduce((s, r) => s + r.total, 0);
  const ticket = contratadas.length ? ganado / contratadas.length : 0;
  const decididas = [...contratadas, ...perdidas];
  const conversion = decididas.length ? Math.round((contratadas.length / decididas.length) * 100) : 0;
  const pendientes = contratadas.filter((r) => r.total - r.cobrado > 0.01);
  const pendienteCobro = pendientes.reduce((s, r) => s + Math.max(0, r.total - r.cobrado), 0);

  const embudo = KANBAN_COLS.map((estado) => {
    const en = rs.filter((r) => r.estado === estado);
    return { estado, items: en, valor: en.reduce((s, r) => s + r.total, 0), n: en.length };
  });
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));

  const prevMap = new Map<string, PipeRow[]>();
  for (const r of contratadas) {
    if (!r.fechaEvento) continue;
    const ym = r.fechaEvento.slice(0, 7);
    if (ym < hoy.slice(0, 7)) continue;
    (prevMap.get(ym) ?? prevMap.set(ym, []).get(ym)!).push(r);
  }
  const prevision = Array.from(prevMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([ym, items]) => ({ ym, items, valor: items.reduce((s, r) => s + r.total, 0), label: MESES[Number(ym.slice(5, 7)) - 1] }));
  const maxPrev = Math.max(1, ...prevision.map((p) => p.valor));

  const canal = agrupa(contratadas, (r) => r.canal || "sin_canal", (k) => CANAL_LABEL[k] ?? "Sin canal");
  const porTipo = agrupa(
    contratadas,
    (r) => (r.serie === "alquiler_encargo" ? (r.esEncargo ? "venta" : "alquiler") : r.tipoEvento),
    (_k, r) => tipoOperacionLabel(r.serie, r.esEncargo, r.tipoEvento),
  );

  const dormidas = abiertas
    .map((r) => ({ r, dias: diasEntre(r.fechaEntrada, hoy) }))
    .filter((x) => x.dias != null && x.dias > 14)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))
    .slice(0, 12);

  // (1) Top oportunidades del pipe: las abiertas de mayor importe.
  const topOpps = [...abiertas].sort((a, b) => b.total - a.total).slice(0, 8);

  // (2) Por qué no cerramos: motivos de las perdidas/descartadas.
  const motivos = agrupa(
    perdidas,
    (r) => r.motivoPerdida || "sin_motivo",
    (k) => (k === "sin_motivo" ? "Sin especificar" : MOTIVO_PERDIDA_LABEL[k] ?? k),
  ).sort((a, b) => b.n - a.n);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m.n));

  // (7) Tiempo medio de cierre: de la entrada a la confirmación, por canal.
  const cierres = contratadas
    .map((r) => ({ r, dias: diasEntre(r.fechaEntrada, r.fechaConfirmacion) }))
    .filter((x): x is { r: PipeRow; dias: number } => x.dias != null && x.dias >= 0);
  const mediaCierre = cierres.length ? Math.round(cierres.reduce((s, x) => s + x.dias, 0) / cierres.length) : null;
  const cierrePorCanal = (() => {
    const m = new Map<string, { label: string; suma: number; n: number; items: PipeRow[] }>();
    for (const { r, dias } of cierres) {
      const k = r.canal || "sin_canal";
      const a = m.get(k) ?? { label: CANAL_LABEL[k] ?? "Sin canal", suma: 0, n: 0, items: [] };
      a.suma += dias; a.n += 1; a.items.push(r);
      m.set(k, a);
    }
    return Array.from(m.values()).map((v) => ({ ...v, media: Math.round(v.suma / v.n) })).sort((a, b) => a.media - b.media);
  })();
  const maxCierre = Math.max(1, ...cierrePorCanal.map((c) => c.media));

  // (8) Estacionalidad: en qué mes del año entran más leads (por fecha de entrada).
  const estacional = (() => {
    const arr = Array.from({ length: 12 }, (_, i) => ({ mes: i, items: [] as PipeRow[] }));
    for (const r of rs) {
      if (!r.fechaEntrada) continue;
      arr[Number(r.fechaEntrada.slice(5, 7)) - 1].items.push(r);
    }
    return arr;
  })();
  const maxEstacional = Math.max(1, ...estacional.map((e) => e.items.length));

  const tiposPresentes = Array.from(new Set(rows.map((r) => r.tipoEvento)));
  const sel =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] text-ink-secondary focus:border-sage-300 focus:outline-none";

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2">
        <select value={serie} onChange={(e) => setSerie(e.target.value)} className={sel}>
          <option value="">Serie: todas</option>
          <option value="evento">Eventos</option>
          <option value="alquiler_encargo">Alquiler / venta</option>
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
          <option value="">Tipo: todos</option>
          {tiposPresentes.map((t) => (
            <option key={t} value={t}>{TIPO_EVENTO_LABEL[t] ?? t}</option>
          ))}
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={sel}>
          <option value="">Periodo: todo</option>
          <option value="proximos">Eventos próximos</option>
          <option value="ano">Este año ({anoActual})</option>
        </select>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
          <MousePointerClick size={13} /> Pincha en cualquier dato para ver el desglose
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-sage px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-sage-600"
        >
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      {/* Desglose (drill-down) — aparece al pinchar cualquier dato */}
      {detalle && <DetallePanel detalle={detalle} onClose={() => setDetalle(null)} hoy={hoy} />}

      {/* Termómetro: objetivo del mes = cubrir los gastos fijos */}
      {termometro.length > 0 && (
        <Card
          title="Objetivo del mes · cubrir los gastos fijos"
          note="Cuánto de los gastos fijos del mes (local, software, sueldo…) ya cubres con la contribución de los eventos contratados. Al 100 % llegas a break-even; por encima, es beneficio."
        >
          <div className="space-y-4">
            {termometro.map((m, i) => (
              <TermometroRow key={m.ym} m={m} destacado={i === 0} />
            ))}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Pipe abierto" value={eur(pipeAbierto)} sub={`${abiertas.length} oportunidades`} onClick={() => abrir("Pipe abierto · oportunidades sin cerrar", abiertas)} />
        <Kpi label="Ponderado" value={eur(ponderado)} sub="por probabilidad" tone="clay" onClick={() => abrir("Pipe ponderado · abiertas (con su probabilidad)", abiertas)} />
        <Kpi label="Ganado (contratado)" value={eur(ganado)} sub={`${contratadas.length} contratadas`} tone="ok" onClick={() => abrir("Ganado · oportunidades contratadas", contratadas)} />
        <Kpi label="Ticket medio" value={eur(ticket)} sub="por evento ganado" onClick={() => abrir("Ticket medio · contratadas (base del promedio)", contratadas)} />
        <Kpi label="Conversión" value={`${conversion} %`} sub={`${contratadas.length} de ${decididas.length} decididas`} tone="ok" onClick={() => abrir("Conversión · oportunidades ya decididas (ganadas + perdidas)", decididas)} />
        <Kpi label="Pendiente de cobro" value={eur(pendienteCobro)} sub="de lo contratado" tone="clay" onClick={() => abrir("Pendiente de cobro · contratadas con saldo", pendientes)} />
      </div>

      <Card title="Embudo por valor (€ en cada etapa)" note="No cuántas hay, sino cuánto dinero. Dónde está atascado el pipeline.">
        {embudo.map((e) => (
          <BarRow
            key={e.estado}
            name={ESTADO_META[e.estado as keyof typeof ESTADO_META]?.label ?? e.estado}
            value={eur(e.valor)}
            count={e.n}
            pct={(e.valor / maxEmbudo) * 100}
            color={COLOR_ETAPA[e.estado] ?? "#69775C"}
            onClick={e.n ? () => abrir(`Etapa · ${ESTADO_META[e.estado as keyof typeof ESTADO_META]?.label ?? e.estado}`, e.items) : undefined}
          />
        ))}
      </Card>

      <Card title="Top oportunidades del pipe" note="Las abiertas de mayor importe — donde está el dinero gordo por cerrar.">
        {topOpps.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No hay oportunidades abiertas ahora mismo.</p>
        ) : (
          <div>
            {topOpps.map((r, i) => (
              <a key={r.id} href={`/oportunidades/${r.id}`} className="flex items-center justify-between gap-3 border-t border-hair py-2.5 first:border-t-0 hover:text-sage">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-4 shrink-0 text-right text-[11px] font-bold tabular text-ink-muted">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="text-[12.5px]">{r.titulo}</span>
                    <span className="ml-2 rounded-pill bg-sage-tint px-2 py-0.5 text-[10px] font-semibold text-sage">
                      {ESTADO_META[r.estado as keyof typeof ESTADO_META]?.label ?? r.estado}
                    </span>
                    <div className="text-[11px] text-ink-muted">{r.cliente ?? "—"} · {r.prob}% prob.</div>
                  </span>
                </span>
                <span className="shrink-0 font-display text-[15px] tabular text-sage">{eur(r.total)}</span>
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card title="Previsión de ingresos por mes" note="Facturación esperada según la fecha de cada evento (contratadas y en curso).">
        {prevision.length === 0 ? (
          <Vacio />
        ) : (
          <div className="flex h-[190px] items-end gap-3 border-b border-border pt-2">
            {prevision.map((p) => (
              <button
                key={p.ym}
                onClick={() => abrir(`Previsión · ${p.label} ${p.ym.slice(0, 4)}`, p.items)}
                className="group flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
              >
                <div className="mb-1.5 text-[11px] font-semibold tabular text-sage">{eur(p.valor)}</div>
                <div
                  className="w-full max-w-[46px] rounded-t-md transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(3, (p.valor / maxPrev) * 100)}%`, background: "linear-gradient(180deg,#BE6E4C,#d08a6b)" }}
                />
                <div className="mt-1.5 text-[11px] text-ink-secondary">
                  {p.label}{p.ym.slice(0, 4) !== anoActual ? ` ${p.ym.slice(2, 4)}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="¿De dónde vienen las ventas?" note="Facturación ganada por canal de entrada.">
          {canal.length === 0 ? <Vacio /> : canal.map((c) => (
            <BarRow key={c.key} name={c.label} value={eur(c.valor)} count={c.n} pct={(c.valor / canal[0].valor) * 100} color="#3F4A36" onClick={() => abrir(`Canal · ${c.label}`, c.items)} />
          ))}
        </Card>
        <Card title="Reparto por tipo" note="Valor contratado según el tipo de evento.">
          {porTipo.length === 0 ? <Vacio /> : porTipo.map((c) => (
            <BarRow key={c.key} name={c.label} value={eur(c.valor)} count={c.n} pct={(c.valor / porTipo[0].valor) * 100} color="#BE6E4C" onClick={() => abrir(`Tipo · ${c.label}`, c.items)} />
          ))}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Por qué no cerramos" note="Motivos de las oportunidades perdidas o rechazadas.">
          {motivos.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No hay oportunidades perdidas registradas. 👌</p>
          ) : motivos.map((m) => (
            <BarRow
              key={m.key}
              name={m.label}
              value={`${Math.round((m.n / Math.max(1, perdidas.length)) * 100)}%`}
              count={m.n}
              pct={(m.n / maxMotivo) * 100}
              color="#B4554A"
              onClick={() => abrir(`Perdidas · ${m.label}`, m.items)}
            />
          ))}
        </Card>
        <Card
          title="Tiempo medio de cierre"
          note={mediaCierre != null ? `Media: ${mediaCierre} días de la entrada a la confirmación · barra más corta = más rápido.` : "Aún no hay confirmadas con fechas suficientes."}
        >
          {cierrePorCanal.length === 0 ? <Vacio /> : cierrePorCanal.map((c) => (
            <BarRow
              key={c.label}
              name={c.label}
              value={`${c.media} días`}
              count={c.n}
              pct={(c.media / maxCierre) * 100}
              color="#69775C"
              onClick={() => abrir(`Cierre · ${c.label}`, c.items)}
            />
          ))}
        </Card>
      </div>

      <Card title="Estacionalidad · entrada de leads" note="En qué meses del año entran más oportunidades (por fecha de entrada, sumando todos los años).">
        <div className="flex h-[170px] items-end gap-2 border-b border-border pt-2">
          {estacional.map((e) => (
            <button
              key={e.mes}
              onClick={() => e.items.length && abrir(`Leads de ${MESES[e.mes]}`, e.items)}
              className="group flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
            >
              <div className="mb-1 text-[10.5px] font-semibold tabular text-sage">{e.items.length || ""}</div>
              <div
                className="w-full max-w-[40px] rounded-t-md bg-sage transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(2, (e.items.length / maxEstacional) * 100)}%` }}
              />
              <div className="mt-1.5 text-[10.5px] capitalize text-ink-secondary">{MESES[e.mes]}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Oportunidades que se están enfriando" note="Abiertas sin movimiento hace tiempo — para retomarlas antes de perderlas.">
        {dormidas.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Ninguna abierta lleva más de 2 semanas parada. 👌</p>
        ) : (
          <div>
            {dormidas.map(({ r, dias }) => (
              <a
                key={r.id}
                href={`/oportunidades/${r.id}`}
                className="flex items-center justify-between gap-3 border-t border-hair py-2.5 first:border-t-0 hover:text-sage"
              >
                <div className="min-w-0">
                  <span className="text-[12.5px]">{r.titulo}</span>
                  <span className="ml-2 rounded-pill bg-sage-tint px-2 py-0.5 text-[10px] font-semibold text-sage">
                    {ESTADO_META[r.estado as keyof typeof ESTADO_META]?.label ?? r.estado}
                  </span>
                  <div className="text-[11px] text-ink-muted">{r.cliente ?? "—"} · {eur(r.total)}</div>
                </div>
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold tabular ${(dias ?? 0) > 21 ? "bg-error-tint text-error" : "bg-warn-tint text-warn"}`}>
                  {dias} días
                </span>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Panel de desglose: la lista de oportunidades detrás del dato pinchado.
function DetallePanel({ detalle, onClose, hoy }: { detalle: Detalle; onClose: () => void; hoy: string }) {
  const items = [...detalle.items].sort((a, b) => b.total - a.total);
  const total = items.reduce((s, r) => s + r.total, 0);
  return (
    <div className="rounded-lg border-med border-sage-300 bg-sage-tint/30 p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">Desglose</div>
          <div className="mt-0.5 text-[13.5px] font-medium text-ink">{detalle.titulo}</div>
          <div className="text-[11.5px] text-ink-muted">{items.length} oportunidades · {eur(total)}</div>
        </div>
        <button onClick={onClose} className="no-print rounded-sm p-1 text-ink-muted hover:bg-white hover:text-ink" aria-label="Cerrar desglose">
          <X size={16} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-[13px] text-ink-muted">No hay oportunidades en este grupo.</p>
      ) : (
        <div className="overflow-hidden rounded-md border-hair border-border bg-white">
          {items.map((r) => {
            const dias = diasEntre(r.fechaEntrada, hoy);
            return (
              <a key={r.id} href={`/oportunidades/${r.id}`} className="flex items-center justify-between gap-3 border-b border-hair px-3 py-2 text-[12.5px] last:border-b-0 hover:bg-sage-tint/40">
                <span className="min-w-0 flex-1 truncate">
                  {r.titulo}
                  <span className="ml-2 text-ink-muted">{r.cliente ?? "—"}</span>
                </span>
                <span className="shrink-0 rounded-pill bg-beige-warm px-2 py-0.5 text-[10px] font-semibold text-ink-secondary">
                  {ESTADO_META[r.estado as keyof typeof ESTADO_META]?.label ?? r.estado}
                </span>
                {r.prob < 100 && ABIERTAS.includes(r.estado) && (
                  <span className="hidden shrink-0 text-[11px] text-ink-muted tabular sm:inline">{r.prob}%</span>
                )}
                {dias != null && <span className="hidden shrink-0 text-[11px] text-ink-muted tabular md:inline">{dias}d</span>}
                <span className="w-[84px] shrink-0 text-right font-semibold tabular">{eur(r.total)}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TermometroRow({ m, destacado }: { m: CoberturaMes; destacado: boolean }) {
  const pct = Math.max(0, m.pct);
  const cubierto = pct >= 100;
  const color = cubierto ? "#5B7A52" : pct >= 70 ? "#B8842B" : "#B4554A";
  const [ano, mes] = m.ym.split("-");
  const label = `${MESES_LARGO[Number(mes) - 1]} ${ano}`;
  const falta = Math.max(0, m.maquina - m.contribucion);
  const sobra = Math.max(0, m.contribucion - m.maquina);
  return (
    <div className={destacado ? "rounded-md bg-sage-tint/25 p-3" : ""}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={`font-medium ${destacado ? "text-[14px] text-ink" : "text-[12.5px] text-ink-secondary"}`}>
          {label}
          {destacado && <span className="ml-2 text-[11px] font-normal text-ink-muted">(este mes)</span>}
        </span>
        <span className="text-[12px] tabular text-ink-secondary">
          <b style={{ color }}>{eur(m.contribucion)}</b> de {eur(m.maquina)}
        </span>
      </div>
      <div className="relative h-[26px] overflow-hidden rounded-md bg-beige-warm">
        <div className="h-full rounded-md transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold tabular" style={{ color: cubierto ? "#fff" : color }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="mt-1 text-[11px] text-ink-muted">
        {m.nEventos === 0
          ? "Sin eventos contratados todavía este mes."
          : cubierto
            ? `✓ Gastos fijos cubiertos · +${eur(sobra)} de beneficio (${m.nEventos} evento${m.nEventos > 1 ? "s" : ""}).`
            : `Faltan ${eur(falta)} para cubrir los fijos (${m.nEventos} evento${m.nEventos > 1 ? "s" : ""} contratado${m.nEventos > 1 ? "s" : ""}).`}
      </div>
    </div>
  );
}

function agrupa(
  rows: PipeRow[],
  keyFn: (r: PipeRow) => string,
  labelFn: (k: string, r: PipeRow) => string,
): { key: string; label: string; valor: number; n: number; items: PipeRow[] }[] {
  const m = new Map<string, { label: string; valor: number; n: number; items: PipeRow[] }>();
  for (const r of rows) {
    const k = keyFn(r);
    const a = m.get(k) ?? { label: labelFn(k, r), valor: 0, n: 0, items: [] };
    a.valor += r.total;
    a.n += 1;
    a.items.push(r);
    m.set(k, a);
  }
  return Array.from(m.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.valor - a.valor);
}

function Kpi({ label, value, sub, tone, onClick }: { label: string; value: string; sub: string; tone?: "clay" | "ok"; onClick?: () => void }) {
  const c = tone === "clay" ? "text-clay-600" : tone === "ok" ? "text-ok" : "text-sage";
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-hair border-border bg-white p-3.5 text-left transition-colors hover:border-sage-300 hover:bg-sage-tint/20"
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</div>
      <div className={`mt-2 font-display text-[22px] leading-none ${c}`}>{value}</div>
      <div className="mt-1.5 text-[11px] text-ink-secondary">{sub}</div>
    </button>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="avoid-break rounded-lg border-hair border-border bg-white p-5 md:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">{title}</div>
      {note && <div className="mb-4 mt-0.5 text-[11.5px] text-ink-muted">{note}</div>}
      <div className={note ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function BarRow({ name, value, count, pct, color, onClick }: { name: string; value: string; count: number; pct: number; color: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="w-[112px] shrink-0 truncate text-left text-[12px]">{name}</div>
      <div className="h-[22px] flex-1 overflow-hidden rounded-md bg-beige-warm">
        <div className="h-full rounded-md transition-opacity" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
      </div>
      <div className="w-[86px] shrink-0 text-right text-[12px] font-semibold tabular">{value}</div>
      <div className="w-[26px] shrink-0 text-right text-[11px] text-ink-muted">{count}</div>
    </>
  );
  if (!onClick) return <div className="mb-2.5 flex items-center gap-3">{inner}</div>;
  return (
    <button onClick={onClick} className="group mb-2.5 flex w-full items-center gap-3 hover:opacity-90">
      {inner}
    </button>
  );
}

function Vacio() {
  return <p className="py-4 text-center text-[13px] text-ink-muted">Sin datos con el filtro actual.</p>;
}
