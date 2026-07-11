import { eur, num } from "@/lib/format";
import { FASES_HORAS } from "@/lib/estados";

// Colores por fase (mismos tonos que el resto de la app).
const FASE_COLOR: Record<string, string> = {
  comercial: "#BE6E4C", // clay
  pre: "#7C8A5A", // sage claro
  evento: "#3F4A36", // sage
  post: "#B8AE9C", // arena
};

export type DistribPersona = {
  nombre: string;
  total: number; // horas de la semana
  coste: number; // € de esas horas
  fases: Record<string, number>; // horas por fase
  proyectos: { titulo: string; horas: number }[]; // top proyectos
};

export function DistribucionSemanal({
  personas,
  rango,
}: {
  personas: DistribPersona[];
  rango: string;
}) {
  if (personas.length === 0) {
    return (
      <p className="py-2 text-small text-ink-muted">
        Nadie ha imputado horas esta semana ({rango}). Se apuntan desde la ficha de cada evento →
        pestaña <b>Costes → Personal (horas)</b>, marcando su fase.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {personas.map((p) => (
        <div key={p.nombre} className="rounded-md border-hair border-border bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold">{p.nombre}</span>
            <span className="text-[12px] text-ink-secondary">
              <b className="tabular text-ink">{num(p.total, 1)} h</b> · {eur(p.coste)}
            </span>
          </div>

          {/* Barra apilada por fase */}
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-beige-warm">
            {FASES_HORAS.map((f) => {
              const h = p.fases[f.value] ?? 0;
              if (h <= 0) return null;
              const pct = p.total > 0 ? (h / p.total) * 100 : 0;
              return (
                <div
                  key={f.value}
                  title={`${f.label}: ${num(h, 1)} h`}
                  style={{ width: `${pct}%`, backgroundColor: FASE_COLOR[f.value] }}
                />
              );
            })}
          </div>
          {/* Leyenda de fases con horas */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-secondary">
            {FASES_HORAS.map((f) => {
              const h = p.fases[f.value] ?? 0;
              if (h <= 0) return null;
              return (
                <span key={f.value} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FASE_COLOR[f.value] }} />
                  {f.label} <b className="tabular">{num(h, 1)} h</b>
                </span>
              );
            })}
          </div>

          {/* Proyectos de la semana */}
          {p.proyectos.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Por proyecto
              </div>
              <div className="space-y-0.5">
                {p.proyectos.map((pr) => (
                  <div key={pr.titulo} className="flex items-center justify-between text-[12px]">
                    <span className="min-w-0 truncate text-ink-secondary">{pr.titulo}</span>
                    <span className="ml-2 shrink-0 tabular text-ink">{num(pr.horas, 1)} h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
