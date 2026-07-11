import Link from "next/link";
import { Card } from "@/components/ui/card";
import { eur } from "@/lib/format";

type Fila = { persona: string; devengado: number; pagado: number; pendiente: number };

// Tarjeta-resumen de comisiones (para Tesorería y Contabilidad): devengado,
// pagado y pendiente, con desglose por persona. Enlaza a la página completa.
export function ResumenComisiones({
  devengado,
  pagado,
  pendiente,
  porPersona,
}: {
  devengado: number;
  pagado: number;
  pendiente: number;
  porPersona: Fila[];
}) {
  if (devengado <= 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Comisiones</span>
        <Link href="/comisiones" className="text-[11.5px] font-semibold text-sage hover:underline">
          Ver y pagar →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Devengado" v={eur(devengado)} tone="text-ink" />
        <Kpi label="Pagado" v={eur(pagado)} tone="text-ok" />
        <Kpi label="Pendiente" v={eur(pendiente)} tone={pendiente > 0.01 ? "text-warn" : "text-ink"} />
      </div>
      {porPersona.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border pt-2">
          {porPersona.map((p) => (
            <div key={p.persona} className="flex items-center justify-between text-[12.5px]">
              <span className="text-ink-secondary">{p.persona}</span>
              <span className="tabular">
                {p.pendiente > 0.01 ? (
                  <span className="font-semibold text-warn">{eur(p.pendiente)} pendiente</span>
                ) : (
                  <span className="text-ink-muted">al día</span>
                )}
                <span className="ml-2 text-ink-muted">· {eur(p.devengado)} total</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-ink-muted">
        La comisión se devenga cuando la oportunidad está cobrada. Al pagarla se registra en
        Tesorería (naturaleza «comisión»), que no computa en la contabilidad mensual (§5.4).
      </p>
    </Card>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone: string }) {
  return (
    <div className="rounded-md border-hair border-border bg-white p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 font-display text-[18px] tabular ${tone}`}>{v}</div>
    </div>
  );
}
