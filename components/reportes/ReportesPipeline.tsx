"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { eur } from "@/lib/format";
import {
  KANBAN_COLS,
  ESTADO_META,
  TIPO_EVENTO_LABEL,
  CANAL_LABEL,
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
  total: number;
  cobrado: number;
  prob: number; // 0..100
};

const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];
const ABIERTAS = ["nueva", "contestada", "en_conversacion", "presupuesto_enviado"];
const CERRADAS_PERDIDAS = ["perdida", "descartada"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Color de cada etapa en el embudo (sage para pre-venta, clay para el momento
// clave de "presupuesto enviado", verde ok para lo ya contratado).
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

function diasEntre(desde: string | null, hoy: string): number | null {
  if (!desde) return null;
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hoy}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function ReportesPipeline({ rows, hoy }: { rows: PipeRow[]; hoy: string }) {
  const [serie, setSerie] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [periodo, setPeriodo] = React.useState(""); // "" | proximos | ano

  const anoActual = hoy.slice(0, 4);
  const rs = rows.filter((r) => {
    if (serie && r.serie !== serie) return false;
    if (tipo && r.tipoEvento !== tipo) return false;
    if (periodo === "proximos" && !(r.fechaEvento && r.fechaEvento >= hoy)) return false;
    if (periodo === "ano" && (r.fechaEvento ?? "").slice(0, 4) !== anoActual) return false;
    return true;
  });

  // --- KPIs ---
  const abiertas = rs.filter((r) => ABIERTAS.includes(r.estado));
  const contratadas = rs.filter((r) => CONTRATADAS.includes(r.estado));
  const perdidas = rs.filter((r) => CERRADAS_PERDIDAS.includes(r.estado));
  const pipeAbierto = abiertas.reduce((s, r) => s + r.total, 0);
  const ponderado = abiertas.reduce((s, r) => s + r.total * (r.prob / 100), 0);
  const ganado = contratadas.reduce((s, r) => s + r.total, 0);
  const ticket = contratadas.length ? ganado / contratadas.length : 0;
  const decididas = contratadas.length + perdidas.length;
  const conversion = decididas ? Math.round((contratadas.length / decididas) * 100) : 0;
  const pendienteCobro = contratadas.reduce((s, r) => s + Math.max(0, r.total - r.cobrado), 0);

  // --- Embudo por valor ---
  const embudo = KANBAN_COLS.map((estado) => {
    const en = rs.filter((r) => r.estado === estado);
    return { estado, valor: en.reduce((s, r) => s + r.total, 0), n: en.length };
  });
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));

  // --- Previsión de ingresos por mes (contratadas, por fecha de evento) ---
  const prevMap = new Map<string, number>();
  for (const r of contratadas) {
    if (!r.fechaEvento) continue;
    const ym = r.fechaEvento.slice(0, 7);
    if (ym < hoy.slice(0, 7)) continue; // solo de este mes en adelante
    prevMap.set(ym, (prevMap.get(ym) ?? 0) + r.total);
  }
  const prevision = Array.from(prevMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([ym, valor]) => ({ ym, valor, label: MESES[Number(ym.slice(5, 7)) - 1] }));
  const maxPrev = Math.max(1, ...prevision.map((p) => p.valor));

  // --- Por canal (facturación ganada) ---
  const canal = agrupa(contratadas, (r) => r.canal || "sin_canal", (k) => CANAL_LABEL[k] ?? "Sin canal");
  // --- Por tipo (valor contratado) ---
  const porTipo = agrupa(
    contratadas,
    (r) => (r.serie === "alquiler_encargo" ? (r.esEncargo ? "venta" : "alquiler") : r.tipoEvento),
    (k, r) => tipoOperacionLabel(r.serie, r.esEncargo, r.tipoEvento),
  );

  // --- Dormidas (abiertas sin movimiento) ---
  const dormidas = abiertas
    .map((r) => ({ ...r, dias: diasEntre(r.fechaEntrada, hoy) }))
    .filter((r) => r.dias != null && r.dias > 14)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))
    .slice(0, 12);

  const tiposPresentes = Array.from(new Set(rows.map((r) => r.tipoEvento)));
  const sel =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] text-ink-secondary focus:border-sage-300 focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Filtros */}
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
        <button
          onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-sage px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-sage-600"
        >
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Pipe abierto" value={eur(pipeAbierto)} sub={`${abiertas.length} oportunidades`} />
        <Kpi label="Ponderado" value={eur(ponderado)} sub="por probabilidad" tone="clay" />
        <Kpi label="Ganado (contratado)" value={eur(ganado)} sub={`${contratadas.length} contratadas`} tone="ok" />
        <Kpi label="Ticket medio" value={eur(ticket)} sub="por evento ganado" />
        <Kpi label="Conversión" value={`${conversion} %`} sub={`${contratadas.length} de ${decididas} decididas`} tone="ok" />
        <Kpi label="Pendiente de cobro" value={eur(pendienteCobro)} sub="de lo contratado" tone="clay" />
      </div>

      {/* Embudo por valor */}
      <Card title="Embudo por valor (€ en cada etapa)" note="No cuántas hay, sino cuánto dinero. Dónde está atascado el pipeline.">
        {embudo.map((e) => (
          <BarRow
            key={e.estado}
            name={ESTADO_META[e.estado as keyof typeof ESTADO_META]?.label ?? e.estado}
            value={eur(e.valor)}
            count={e.n}
            pct={(e.valor / maxEmbudo) * 100}
            color={COLOR_ETAPA[e.estado] ?? "#69775C"}
          />
        ))}
      </Card>

      {/* Previsión por mes */}
      <Card title="Previsión de ingresos por mes" note="Facturación esperada según la fecha de cada evento (contratadas y en curso).">
        {prevision.length === 0 ? (
          <Vacio />
        ) : (
          <div className="flex h-[190px] items-end gap-3 border-b border-border pt-2">
            {prevision.map((p) => (
              <div key={p.ym} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-1.5 text-[11px] font-semibold tabular text-sage">{eur(p.valor)}</div>
                <div
                  className="w-full max-w-[46px] rounded-t-md"
                  style={{ height: `${Math.max(3, (p.valor / maxPrev) * 100)}%`, background: "linear-gradient(180deg,#BE6E4C,#d08a6b)" }}
                />
                <div className="mt-1.5 text-[11px] text-ink-secondary">
                  {p.label}
                  {p.ym.slice(0, 4) !== anoActual ? ` ${p.ym.slice(2, 4)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="¿De dónde vienen las ventas?" note="Facturación ganada por canal de entrada.">
          {canal.length === 0 ? <Vacio /> : canal.map((c) => (
            <BarRow key={c.key} name={c.label} value={eur(c.valor)} count={c.n} pct={(c.valor / canal[0].valor) * 100} color="#3F4A36" />
          ))}
        </Card>
        <Card title="Reparto por tipo" note="Valor contratado según el tipo de evento.">
          {porTipo.length === 0 ? <Vacio /> : porTipo.map((c) => (
            <BarRow key={c.key} name={c.label} value={eur(c.valor)} count={c.n} pct={(c.valor / porTipo[0].valor) * 100} color="#BE6E4C" />
          ))}
        </Card>
      </div>

      {/* Dormidas */}
      <Card title="Oportunidades que se están enfriando" note="Abiertas sin movimiento hace tiempo — para retomarlas antes de perderlas.">
        {dormidas.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Ninguna abierta lleva más de 2 semanas parada. 👌</p>
        ) : (
          <div>
            {dormidas.map((r) => (
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
                  <div className="text-[11px] text-ink-muted">
                    {r.cliente ?? "—"} · {eur(r.total)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold tabular ${
                    (r.dias ?? 0) > 21 ? "bg-error-tint text-error" : "bg-warn-tint text-warn"
                  }`}
                >
                  {r.dias} días
                </span>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Agrupa filas por una clave y devuelve [{key,label,valor,n}] ordenado desc.
function agrupa(
  rows: PipeRow[],
  keyFn: (r: PipeRow) => string,
  labelFn: (k: string, r: PipeRow) => string,
): { key: string; label: string; valor: number; n: number }[] {
  const m = new Map<string, { label: string; valor: number; n: number }>();
  for (const r of rows) {
    const k = keyFn(r);
    const a = m.get(k) ?? { label: labelFn(k, r), valor: 0, n: 0 };
    a.valor += r.total;
    a.n += 1;
    m.set(k, a);
  }
  return Array.from(m.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.valor - a.valor);
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "clay" | "ok" }) {
  const c = tone === "clay" ? "text-clay-600" : tone === "ok" ? "text-ok" : "text-sage";
  return (
    <div className="rounded-lg border-hair border-border bg-white p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</div>
      <div className={`mt-2 font-display text-[22px] leading-none ${c}`}>{value}</div>
      <div className="mt-1.5 text-[11px] text-ink-secondary">{sub}</div>
    </div>
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

function BarRow({ name, value, count, pct, color }: { name: string; value: string; count: number; pct: number; color: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <div className="w-[112px] shrink-0 truncate text-[12px]">{name}</div>
      <div className="h-[22px] flex-1 overflow-hidden rounded-md bg-beige-warm">
        <div className="h-full rounded-md" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
      </div>
      <div className="w-[86px] shrink-0 text-right text-[12px] font-semibold tabular">{value}</div>
      <div className="w-[26px] shrink-0 text-right text-[11px] text-ink-muted">{count}</div>
    </div>
  );
}

function Vacio() {
  return <p className="py-4 text-center text-[13px] text-ink-muted">Sin datos con el filtro actual.</p>;
}
