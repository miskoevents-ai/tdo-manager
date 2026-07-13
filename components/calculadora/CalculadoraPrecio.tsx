"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calculator, ChevronDown, ChevronUp, Plus, RotateCcw, Save, Settings2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { guardarCalculadoraConfig, guardarCalculoPrecio } from "@/app/actions";
import {
  calcularPrecio,
  cuotaPorEvento,
  mezclarConfig,
  CALCULADORA_DEFAULTS,
  type CalculadoraConfig,
  type CalculoInputs,
  type PersonaLinea,
} from "@/lib/calculadora-precio";
import { eur, num } from "@/lib/format";

export type PersonaOpcion = { nombre: string; precioHora: number | null; esSocio: boolean };

const TEMporada_META = {
  alta: { emoji: "🌞", label: "Temporada alta", nota: "hay demanda: vender caro" },
  media: { emoji: "🌗", label: "Temporada media", nota: "objetivo estándar" },
  baja: { emoji: "❄️", label: "Temporada baja", nota: "se acepta menos margen; antes que bajar precio, regala extras" },
} as const;

const TAMANO_LABEL: Record<string, string> = {
  pequeno: "pequeño (+5 pts de margen)",
  medio: "medio",
  grande: "grande (−5 pts)",
  muy_grande: "muy grande (−10 pts)",
};

const SEMAFORO_META = {
  verde: { emoji: "🟢", clase: "border-ok bg-ok-tint text-ok", texto: "Precio correcto" },
  ambar: { emoji: "🟡", clase: "border-[#e7d3a6] bg-warn-tint text-[#7a5a1a]", texto: "Cubre costes, pero gana poco" },
  rojo: { emoji: "🔴", clase: "border-error bg-error-tint text-error", texto: "Por debajo de coste: se pierde dinero" },
} as const;

function NumInput({
  label,
  value,
  onChange,
  step = 1,
  sufijo,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  sufijo?: string;
  hint?: string;
}) {
  return (
    <label className="block text-[11px] text-ink-secondary" title={hint}>
      <span className="mb-1 block font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
        {hint ? " ⓘ" : ""}
      </span>
      <span className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="py-2 text-right text-[13px] tabular"
        />
        {sufijo && <span className="shrink-0 text-[11px] text-ink-muted">{sufijo}</span>}
      </span>
    </label>
  );
}

export function CalculadoraPrecio({
  oportunidadId,
  serie,
  tipoEvento,
  fechaEvento,
  presupuestoBase,
  boteFijos,
  ivaPct = 21,
  configGuardada,
  calculoInicial,
  personasEquipo = [],
}: {
  oportunidadId: string;
  serie: string | null;
  tipoEvento: string | null;
  fechaEvento: string | null;
  presupuestoBase: number;
  boteFijos: number;
  ivaPct?: number;
  configGuardada: unknown;
  calculoInicial: unknown;
  personasEquipo?: PersonaOpcion[];
}) {
  const router = useRouter();
  const [cfg, setCfg] = React.useState<CalculadoraConfig>(() => mezclarConfig(configGuardada));

  const precarga = React.useMemo(() => {
    const key = serie === "alquiler_encargo" ? "alquiler_encargo" : (tipoEvento ?? "otro");
    return cfg.horasPorTipo[key] ?? cfg.horasPorTipo.otro;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [inputs, setInputs] = React.useState<CalculoInputs>(() => {
    const g = (calculoInicial as { inputs?: CalculoInputs } | null)?.inputs;
    if (g && g.horas) {
      // Cálculos guardados con el formato antiguo → se pasan a líneas de persona.
      const personas: PersonaLinea[] = g.personas ?? [];
      if (!g.personas) {
        if (Number(g.horasSocio ?? 0) > 0) {
          personas.push({ nombre: "Socio", horas: Number(g.horasSocio), precioHora: 12, aportado: true });
        }
        if (Number(g.personalExtra ?? 0) > 0) {
          personas.push({ nombre: "Personal externo", horas: 1, precioHora: Number(g.personalExtra), aportado: false });
        }
      }
      return { ...g, personas, horasSocio: 0, personalExtra: 0 };
    }
    return { horas: { ...precarga }, personas: [], materiales: 0, mobiliarioTarifa: 0, transporte: 0 };
  });

  // Desplegable "añadir persona": equipo + externo genérico.
  const [personaSel, setPersonaSel] = React.useState("");
  function anadirPersona(nombre: string) {
    if (!nombre) return;
    const op = personasEquipo.find((p) => p.nombre === nombre);
    const esSocio = op?.esSocio ?? false;
    const linea: PersonaLinea = {
      nombre,
      horas: 2,
      precioHora: op?.precioHora ?? (esSocio ? cfg.costeHoraSocio : 15),
      aportado: esSocio, // los socios aportan (no cobran); se puede cambiar
    };
    setInputs((i) => ({ ...i, personas: [...(i.personas ?? []), linea] }));
    setPersonaSel("");
  }
  function setPersona(idx: number, patch: Partial<PersonaLinea>) {
    setInputs((i) => ({
      ...i,
      personas: (i.personas ?? []).map((p, j) => (j === idx ? { ...p, ...patch } : p)),
    }));
  }
  function quitarPersona(idx: number) {
    setInputs((i) => ({ ...i, personas: (i.personas ?? []).filter((_, j) => j !== idx) }));
  }

  // Si cambia el tipo de evento o la serie (p. ej. se corrige en Editar), se
  // recargan las horas por ese tipo. No corre en el primer render (misma clave),
  // así respeta un cálculo ya guardado.
  const seedRef = React.useRef(`${serie}|${tipoEvento}`);
  React.useEffect(() => {
    const key = `${serie}|${tipoEvento}`;
    if (seedRef.current === key) return;
    seedRef.current = key;
    const pk = serie === "alquiler_encargo" ? "alquiler_encargo" : (tipoEvento ?? "otro");
    const nuevas = cfg.horasPorTipo[pk] ?? cfg.horasPorTipo.otro;
    setInputs((i) => ({ ...i, horas: { ...nuevas } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie, tipoEvento]);

  const [verParams, setVerParams] = React.useState(false);
  const [verDesglose, setVerDesglose] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);

  // Aviso de incoherencia: una boda/comunión/corporativo marcada como
  // "alquiler/encargo" seguramente es un error (comisión y horas de alquiler).
  const tiposEvento = ["boda", "comunion", "corporativo", "cumpleanos", "bautizo", "navidad"];
  const posibleError = serie === "alquiler_encargo" && !!tipoEvento && tiposEvento.includes(tipoEvento);

  const cuotaFijos = cuotaPorEvento(boteFijos, cfg);
  const r = calcularPrecio(inputs, cfg, {
    serie,
    tipoEvento,
    fechaEvento,
    cuotaFijos,
    presupuestoBase: presupuestoBase > 0 ? presupuestoBase : null,
  });
  const temp = TEMporada_META[r.temporada];
  const sem = r.semaforo ? SEMAFORO_META[r.semaforo] : null;
  const conIva = (n: number) => eur(n * (1 + ivaPct / 100));

  const setHora = (k: keyof CalculoInputs["horas"], v: number) =>
    setInputs((i) => ({ ...i, horas: { ...i.horas, [k]: v } }));

  async function guardarCalculo() {
    setBusy("calculo");
    setAviso(null);
    try {
      await guardarCalculoPrecio(oportunidadId, inputs, r);
      setAviso("Cálculo guardado ✓");
      router.refresh();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function guardarParams() {
    setBusy("params");
    setAviso(null);
    try {
      await guardarCalculadoraConfig(cfg);
      setAviso("Parámetros guardados para todo el equipo ✓");
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator size={17} className="text-sage" />
          <span className="font-display text-[17px]">Calculadora de precio</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-pill bg-beige-warm px-2 py-1 font-semibold text-ink-secondary" title={temp.nota}>
            {temp.emoji} {temp.label}
          </span>
          <span className="rounded-pill bg-beige-warm px-2 py-1 font-semibold text-ink-secondary">
            comisión {num(r.comisionPct, 0)}%
          </span>
          <span className="rounded-pill bg-beige-warm px-2 py-1 font-semibold text-ink-secondary">
            {TAMANO_LABEL[r.tamano]}
          </span>
        </div>
      </div>

      {posibleError && (
        <div className="rounded-md border-med border-[#e7d3a6] bg-warn-tint px-3 py-2 text-[12px] text-[#7a5a1a]">
          ⚠️ Esta oportunidad es un evento ({tipoEvento}) pero está marcada como{" "}
          <b>Alquiler / encargo</b>, así que la calculadora usa comisión y horas de alquiler. Si en
          realidad lo montáis vosotros, cámbialo en <b>Editar → Tipo de operación</b> y los cálculos
          se ajustarán.
        </div>
      )}

      {/* Entradas: lo único que toca Cristina */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Horas de Cristina (precargadas por tipo de evento)
        </p>
        <div className="grid grid-cols-4 gap-2">
          <NumInput label="Comercial" value={inputs.horas.comercial} onChange={(v) => setHora("comercial", v)} step={0.5} />
          <NumInput label="Pre-evento" value={inputs.horas.pre} onChange={(v) => setHora("pre", v)} step={0.5} />
          <NumInput label="Evento" value={inputs.horas.durante} onChange={(v) => setHora("durante", v)} step={0.5} />
          <NumInput label="Post" value={inputs.horas.post} onChange={(v) => setHora("post", v)} step={0.5} />
        </div>
      </div>
      {/* Más personas: socios, colaboradores, externos — con desplegable del equipo */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Más personas en el evento
        </p>
        <div className="space-y-2">
          {(inputs.personas ?? []).map((p, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-md bg-beige-light/70 px-2.5 py-2">
              <span className="min-w-[110px] flex-1 text-[13px] font-medium">{p.nombre}</span>
              <label className="flex items-center gap-1 text-[11px] text-ink-muted">
                horas
                <Input type="number" step={0.5} min={0} value={p.horas} onChange={(e) => setPersona(idx, { horas: Math.max(0, Number(e.target.value) || 0) })} className="w-[70px] py-1.5 text-right text-[12.5px] tabular" />
              </label>
              <label className="flex items-center gap-1 text-[11px] text-ink-muted">
                €/h
                <Input type="number" step={0.5} min={0} value={p.precioHora} onChange={(e) => setPersona(idx, { precioHora: Math.max(0, Number(e.target.value) || 0) })} className="w-[70px] py-1.5 text-right text-[12.5px] tabular" />
              </label>
              <span className="tabular text-[12.5px] font-semibold text-ink-secondary">{eur(p.horas * p.precioHora)}</span>
              <label
                className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-secondary"
                title="Aportado: cuenta como coste para el precio, pero no se paga (trabajo regalado por un socio)"
              >
                <input type="checkbox" checked={p.aportado} onChange={(e) => setPersona(idx, { aportado: e.target.checked })} className="h-3.5 w-3.5 accent-sage" />
                aportado (no se cobra)
              </label>
              <button onClick={() => quitarPersona(idx)} className="ml-auto rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error" title="Quitar">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Select value={personaSel} onChange={(e) => anadirPersona(e.target.value)} className="w-auto min-w-[220px] py-2 text-[13px]">
              <option value="">＋ Añadir persona…</option>
              {personasEquipo.map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre}{p.esSocio ? " (socio · aportado)" : ""}
                </option>
              ))}
              <option value="Personal externo">Personal externo</option>
            </Select>
            <span className="text-[11px] text-ink-muted">
              socios entran como «aportado»: cuestan para el precio, no se pagan
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumInput label="Materiales €" value={inputs.materiales} onChange={(v) => setInputs((i) => ({ ...i, materiales: v }))} />
        <NumInput label="Transporte €" value={inputs.transporte} onChange={(v) => setInputs((i) => ({ ...i, transporte: v }))} />
        <NumInput label="Mobiliario propio (tarifario) €" value={inputs.mobiliarioTarifa} onChange={(v) => setInputs((i) => ({ ...i, mobiliarioTarifa: v }))} />
        <NumInput
          label="Precio tope del cliente €"
          value={Number(inputs.precioTope ?? 0)}
          onChange={(v) => setInputs((i) => ({ ...i, precioTope: v }))}
          hint="Si el cliente dice 'tengo X € y punto', ponlo aquí (sin IVA): la calculadora te dice al revés cuánto coste te puedes permitir para que salga rentable."
        />
      </div>

      {/* Resultado */}
      <div className="rounded-md border-hair border-border bg-beige-light/60 p-4">
        <button
          onClick={() => setVerDesglose((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-[12.5px] text-ink-secondary">
            Coste completo del evento: <b className="tabular text-ink">{eur(r.costeTotal)}</b>
            <span className="ml-1 text-[11px] text-ink-muted">(+ comisión según precio)</span>
          </span>
          {verDesglose ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {verDesglose && (
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 border-t border-border pt-2 text-[12px] text-ink-secondary sm:grid-cols-3">
            <span>Cristina ({num(r.desglose.horasCristina, 1)} h): <b className="tabular">{eur(r.desglose.costeCristina)}</b></span>
            {r.desglose.costeSocio > 0 && <span>Aportado por socios (no se paga): <b className="tabular">{eur(r.desglose.costeSocio)}</b></span>}
            {r.desglose.personalExtra > 0 && <span>Personal extra: <b className="tabular">{eur(r.desglose.personalExtra)}</b></span>}
            {r.desglose.materiales > 0 && <span>Materiales: <b className="tabular">{eur(r.desglose.materiales)}</b></span>}
            {r.desglose.desgasteMobiliario > 0 && <span>Desgaste mobiliario: <b className="tabular">{eur(r.desglose.desgasteMobiliario)}</b></span>}
            {r.desglose.transporte > 0 && <span>Transporte: <b className="tabular">{eur(r.desglose.transporte)}</b></span>}
            <span title="Imprevistos y también la inflación de materiales entre el presupuesto y el evento (flores, fungibles…)">
              Contingencia {num(cfg.contingenciaPct, 0)}% ⓘ: <b className="tabular">{eur(r.desglose.contingencia)}</b>
            </span>
            <span>Mermas {num(cfg.mermasPct, 0)}%: <b className="tabular">{eur(r.desglose.mermas)}</b></span>
            <span>Cuota de fijos: <b className="tabular">{eur(r.desglose.cuotaFijos)}</b></span>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-md border-hair border-border bg-white p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Precio mínimo</div>
            <div className="mt-1 font-display text-[20px] tabular text-error">{eur(r.precioMinimo)}</div>
            <div className="text-[10.5px] text-ink-muted">≈ {conIva(r.precioMinimo)} con IVA · por debajo se pierde</div>
          </div>
          <div className="rounded-md border-hair border-border bg-white p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Verde desde ({num(r.margenVerde, 0)}%)</div>
            <div className="mt-1 font-display text-[20px] tabular text-ink">{eur(r.precioVerde)}</div>
            <div className="text-[10.5px] text-ink-muted">≈ {conIva(r.precioVerde)} con IVA · margen aceptable</div>
          </div>
          <div className="rounded-md border-med border-sage bg-sage-tint/50 p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sage">Precio sugerido ({num(r.margenIdeal, 0)}%)</div>
            <div className="mt-1 font-display text-[22px] tabular text-sage">{eur(r.precioSugerido)}</div>
            <div className="text-[10.5px] text-ink-muted">≈ {conIva(r.precioSugerido)} con IVA ({num(ivaPct, 0)}%) · redondeado</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Del precio sugerido ({eur(r.precioSugerido)}): coste <b className="tabular">{eur(r.costeTotal)}</b> ·
          comisión <b className="tabular">{eur(r.precioSugerido * (r.comisionPct / 100))}</b> ·
          tu beneficio <b className="tabular text-sage">{eur(r.precioSugerido * (1 - r.comisionPct / 100) - r.costeTotal)}</b>.
        </p>
        {r.temporada === "baja" && (
          <p className="mt-1 text-[11px] text-ink-muted">
            ❄️ En temporada baja, si el mes está flojo se puede aceptar desde el precio de
            supervivencia (<b className="tabular">{eur(r.precioSupervivencia)}</b>: cubre directos y comisión;
            los fijos se pagan igual). Antes que bajar precio: regala extras.
          </p>
        )}
      </div>

      {/* Semáforo contra el presupuesto actual */}
      {sem && r.presupuestoBase != null ? (
        <div className={`rounded-md border-med p-3 ${sem.clase}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[14px] font-semibold">
              {sem.emoji} Presupuesto actual: {eur(r.presupuestoBase)} — {sem.texto}
            </span>
            <span className="text-[12px]">
              margen <b>{num(r.margenPrevisto ?? 0, 0)}%</b> · beneficio <b className="tabular">{eur(r.beneficioPrevisto ?? 0)}</b>
              {r.beneficioPorHora != null && <> · <b className="tabular">{eur(r.beneficioPorHora)}</b>/h de Cristina</>}
            </span>
          </div>
          {r.desglose.costeSocio > 0 && r.beneficioPrevisto != null && (
            <p className="mt-1 text-[11px] opacity-80">
              {eur(r.desglose.costeSocio)} de los costes son trabajo aportado por socios (no se paga):
              el beneficio que se queda en caja es {eur(r.beneficioPrevisto + r.desglose.costeSocio)}.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Añade líneas al presupuesto (pestaña Presupuesto) y el semáforo comparará el precio
          automáticamente.
        </p>
      )}

      {/* Precio tope del cliente: el cálculo al revés */}
      {r.tope && (
        <div className={`rounded-md border-med p-3 ${SEMAFORO_META[r.tope.semaforo].clase}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[14px] font-semibold">
              {SEMAFORO_META[r.tope.semaforo].emoji} Con el tope del cliente ({eur(r.tope.precio)}):
              margen {num(r.tope.margenPct, 0)}% · beneficio {eur(r.tope.beneficio)}
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-[12px] opacity-90">
            {r.tope.recorteParaVerde > 0.5 ? (
              <>
                <p>
                  Para que este tope salga rentable (margen {num(r.margenVerde, 0)}%), los costes
                  deben bajar a <b className="tabular">{eur(r.tope.costeMaxVerde)}</b> — ahora van en{" "}
                  <b className="tabular">{eur(r.costeTotal)}</b>. Hay que recortar{" "}
                  <b className="tabular">{eur(r.tope.recorteParaVerde)}</b>: menos horas, materiales
                  más sencillos, mobiliario más básico… (o negociar el tope).
                </p>
                {r.tope.semaforo === "rojo" && (
                  <p className="font-semibold">
                    ⚠️ Con los costes actuales, a este precio se pierde dinero. Si no se puede
                    recortar, mejor decir que no.
                  </p>
                )}
              </>
            ) : (
              <p>
                El tope cabe: con los costes actuales ({eur(r.costeTotal)}) queda una holgura de{" "}
                <b className="tabular">{eur(-r.tope.recorteParaVerde)}</b> hasta el límite rentable
                ({eur(r.tope.costeMaxVerde)}). Para el margen ideal ({num(r.margenIdeal, 0)}%), no
                pases de <b className="tabular">{eur(r.tope.costeMaxIdeal)}</b> de coste.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setVerParams((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted hover:text-sage"
        >
          <Settings2 size={13} /> Parámetros del modelo {verParams ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <div className="flex items-center gap-2">
          {aviso && <span className="text-[11.5px] text-ink-secondary">{aviso}</span>}
          <Button size="sm" onClick={guardarCalculo} disabled={busy === "calculo"}>
            <Save size={13} /> {busy === "calculo" ? "Guardando…" : "Guardar cálculo"}
          </Button>
        </div>
      </div>

      {/* Parámetros: para probar y calibrar (se guardan para todos) */}
      {verParams && (
        <div className="space-y-3 rounded-md border-hair border-border bg-beige-light/50 p-4">
          <p className="text-[11px] text-ink-muted">
            Estos números son el modelo acordado. Cámbialos para probar: el cálculo de arriba se
            actualiza al momento. «Guardar parámetros» los fija para todo el equipo.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumInput label="€/h Cristina" value={cfg.costeHoraEmpleada} onChange={(v) => setCfg({ ...cfg, costeHoraEmpleada: v })} step={0.5} />
            <NumInput label="Coste sueldo €/mes" value={cfg.costeMensualEmpleada} onChange={(v) => setCfg({ ...cfg, costeMensualEmpleada: v })} step={10} />
            <NumInput label="% sueldo a eventos" value={cfg.repartoEventosPct} onChange={(v) => setCfg({ ...cfg, repartoEventosPct: v })} sufijo="%" />
            <NumInput label="Eventos / mes" value={cfg.eventosMes} onChange={(v) => setCfg({ ...cfg, eventosMes: v })} />
            <NumInput
              label="Contingencia"
              value={cfg.contingenciaPct}
              onChange={(v) => setCfg({ ...cfg, contingenciaPct: v })}
              sufijo="%"
              hint="Colchón para imprevistos. Sirve también para cubrir la inflación de materiales entre el presupuesto y el evento (flores, fungibles…): si se presupuesta con muchos meses de antelación, conviene subirla."
            />
            <NumInput label="Mermas" value={cfg.mermasPct} onChange={(v) => setCfg({ ...cfg, mermasPct: v })} sufijo="%" />
            <NumInput label="Desgaste mobiliario" value={cfg.desgasteMobiliarioPct} onChange={(v) => setCfg({ ...cfg, desgasteMobiliarioPct: v })} sufijo="%" />
            <NumInput label="€/h socio" value={cfg.costeHoraSocio} onChange={(v) => setCfg({ ...cfg, costeHoraSocio: v })} step={0.5} />
            <NumInput label="Comisión alquiler" value={cfg.comisiones.alquiler} onChange={(v) => setCfg({ ...cfg, comisiones: { ...cfg.comisiones, alquiler: v } })} sufijo="%" />
            <NumInput label="Comisión boda" value={cfg.comisiones.boda} onChange={(v) => setCfg({ ...cfg, comisiones: { ...cfg.comisiones, boda: v } })} sufijo="%" />
            <NumInput label="Comisión corporativo" value={cfg.comisiones.corporativo} onChange={(v) => setCfg({ ...cfg, comisiones: { ...cfg.comisiones, corporativo: v } })} sufijo="%" />
            <NumInput label="Redondeo precio" value={cfg.redondeo} onChange={(v) => setCfg({ ...cfg, redondeo: v })} sufijo="€" />
            <NumInput label="Alta: verde desde" value={cfg.margenes.alta.verde} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, alta: { ...cfg.margenes.alta, verde: v } } })} sufijo="%" />
            <NumInput label="Alta: ideal" value={cfg.margenes.alta.ideal} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, alta: { ...cfg.margenes.alta, ideal: v } } })} sufijo="%" />
            <NumInput label="Media: verde desde" value={cfg.margenes.media.verde} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, media: { ...cfg.margenes.media, verde: v } } })} sufijo="%" />
            <NumInput label="Media: ideal" value={cfg.margenes.media.ideal} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, media: { ...cfg.margenes.media, ideal: v } } })} sufijo="%" />
            <NumInput label="Baja: verde desde" value={cfg.margenes.baja.verde} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, baja: { ...cfg.margenes.baja, verde: v } } })} sufijo="%" />
            <NumInput label="Baja: ideal" value={cfg.margenes.baja.ideal} onChange={(v) => setCfg({ ...cfg, margenes: { ...cfg.margenes, baja: { ...cfg.margenes.baja, ideal: v } } })} sufijo="%" />
            <NumInput label="Beneficio mín. pequeños" value={cfg.tramos.beneficioMinimo} onChange={(v) => setCfg({ ...cfg, tramos: { ...cfg.tramos, beneficioMinimo: v } })} sufijo="€" />
            <NumInput label="Cuota fijos alquileres" value={cfg.cuotaAlquilerPct} onChange={(v) => setCfg({ ...cfg, cuotaAlquilerPct: v })} sufijo="%" />
          </div>
          <p className="text-[11px] text-ink-muted">
            Temporadas: 🌞 alta = may, jun, sep, oct, dic · 🌗 media = abr, jul, nov · ❄️ baja = ene,
            feb, mar, ago. Tramos de tamaño: pequeño &lt; {eur(cfg.tramos.pequenoMax)} · grande ≥{" "}
            {eur(cfg.tramos.grandeMin)} · muy grande ≥ {eur(cfg.tramos.muyGrandeMin)}.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCfg({ ...CALCULADORA_DEFAULTS })}>
              <RotateCcw size={13} /> Valores por defecto
            </Button>
            <Button size="sm" variant="outline" onClick={guardarParams} disabled={busy === "params"}>
              {busy === "params" ? "Guardando…" : "Guardar parámetros (para todos)"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
