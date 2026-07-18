"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Overline } from "@/components/ui/card";
import { num } from "@/lib/format";
import { guardarCalculadoraConfig } from "@/app/actions";
import type { CalculadoraConfig } from "@/lib/calculadora-precio";

export type JornadaData = {
  nombre: string;
  ym: string;
  contratoMes: number; // horas de contrato al mes (25 h/sem × 52/12)
  horasMes: number;
  horasEventoMes: number;
  horasEstructuraMes: number;
  pctEventosReal: number | null; // % horas a eventos, últimos 3 meses
  eventosMesReal: number | null; // eventos/mes, últimos 3 meses
  horas3m: number; // horas totales imputadas en la ventana (para saber si hay datos)
  pctEventosConfig: number;
  eventosMesConfig: number;
  cfg: CalculadoraConfig;
};

// Panel SOLO para socios (vive en el Cuadro de mando): jornada real de la
// empleada contra su contrato y calibración del modelo de precios con datos
// reales. No lo ve Cristina (no tiene acceso a esta sección).
export function JornadaCalibracion({ j }: { j: JornadaData }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  const mesLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${j.ym}-01T00:00:00Z`),
  );
  const pctJornada = j.contratoMes > 0 ? (j.horasMes / j.contratoMes) * 100 : 0;
  const pctEv = j.horasMes > 0 ? (j.horasEventoMes / j.horasMes) * 100 : 0;
  const sobrepasa = j.contratoMes > 0 && j.horasMes > j.contratoMes;
  // Sugerencia de calibración: fiable con ≥ ~40 h de histórico en 3 meses.
  const datosSuf = j.horas3m >= 40;
  const difPct = j.pctEventosReal != null && Math.abs(j.pctEventosReal - j.pctEventosConfig) >= 5;
  const difEv = j.eventosMesReal != null && Math.abs(j.eventosMesReal - j.eventosMesConfig) >= 1;
  const puedeAplicar = datosSuf && (difPct || difEv);

  async function aplicar() {
    if (!j.pctEventosReal && !j.eventosMesReal) return;
    setBusy(true);
    setOk(false);
    try {
      const nuevo = {
        ...j.cfg,
        repartoEventosPct: j.pctEventosReal ?? j.cfg.repartoEventosPct,
        eventosMes: j.eventosMesReal ? Math.max(1, Math.round(j.eventosMesReal)) : j.cfg.eventosMes,
      };
      await guardarCalculadoraConfig(nuevo);
      setOk(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <Overline className="!mt-0">Jornada de {j.nombre} — {mesLabel}</Overline>
        <div className="text-[12px] text-ink-muted">Solo socios · no visible para {j.nombre}</div>
      </div>

      {/* Jornada del mes vs contrato */}
      <div className="text-[13px]">
        <span className="tabular font-semibold text-ink">{num(j.horasMes, 1)} h</span>
        <span className="text-ink-muted"> de {num(j.contratoMes, 0)} h de contrato este mes</span>
        {sobrepasa && <span className="ml-2 font-semibold text-clay">⚠ por encima del contrato</span>}
      </div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-beige-warm">
        <div
          className={`h-full rounded-full ${sobrepasa ? "bg-clay" : pctJornada >= 90 ? "bg-[#c9a24b]" : "bg-sage"}`}
          style={{ width: `${Math.min(100, Math.max(0, pctJornada))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-secondary">
        <span>A eventos: <b className="tabular">{num(j.horasEventoMes, 1)} h</b> ({num(pctEv, 0)}%)</span>
        <span>A estructura / taller / presupuestos: <b className="tabular">{num(j.horasEstructuraMes, 1)} h</b></span>
      </div>

      {/* Calibración del modelo con datos reales (últimos 3 meses) */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Calibración del modelo · últimos 3 meses
        </div>
        {!datosSuf ? (
          <p className="mt-1 text-[12px] text-ink-muted">
            Aún pocos datos ({num(j.horas3m, 0)} h imputadas en la ventana). En cuanto {j.nombre} registre
            partes con regularidad, aquí saldrá el «% horas a eventos» y los «eventos/mes» reales para afinar
            la calculadora con datos en vez de a ojo.
          </p>
        ) : (
          <>
            <div className="mt-1 grid grid-cols-2 gap-x-5 gap-y-1 text-[12.5px]">
              <span className="text-ink-secondary">
                % horas a eventos:{" "}
                <b className="tabular text-ink">{j.pctEventosReal}%</b>
                <span className="text-ink-muted"> real · {j.pctEventosConfig}% en la calculadora</span>
              </span>
              <span className="text-ink-secondary">
                Eventos/mes:{" "}
                <b className="tabular text-ink">{num(j.eventosMesReal ?? 0, 1)}</b>
                <span className="text-ink-muted"> real · {j.eventosMesConfig} en la calculadora</span>
              </span>
            </div>
            {puedeAplicar ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={aplicar}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-sm border-med border-sage bg-sage px-3 py-1.5 text-[12px] font-semibold text-cream hover:bg-sage-600 disabled:opacity-60"
                >
                  {busy ? "Aplicando…" : "Aplicar al modelo"}
                </button>
                <span className="text-[11.5px] text-ink-muted">
                  Ajusta el «% horas a eventos» y los «eventos/mes» de la calculadora a estos valores reales.
                  {j.pctEventosReal != null && j.pctEventosReal > j.pctEventosConfig && " Más horas a eventos → el recargo de estructura baja."}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-[11.5px] text-ink-muted">
                Los valores reales coinciden con la calculadora — el modelo está bien calibrado. ✓
              </p>
            )}
            {ok && <p className="mt-1 text-[11.5px] font-semibold text-ok">✓ Modelo actualizado con los datos reales.</p>}
          </>
        )}
      </div>
    </Card>
  );
}
