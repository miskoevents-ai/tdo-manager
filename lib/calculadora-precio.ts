// ============================================================================
// Calculadora de precio por oportunidad (modelo acordado por los socios).
// El motor es "complejo por dentro, simple por fuera": Cristina solo ve el
// semáforo y los precios; todos estos parámetros viven en Ajustes y se pueden
// probar/cambiar sin tocar código.
// ============================================================================

export type FaseHoras = { comercial: number; pre: number; durante: number; post: number };

export type CalculadoraConfig = {
  // Cristina (empleada): coste empresa por hora y al mes (bruto + SS).
  costeHoraEmpleada: number;
  costeMensualEmpleada: number;
  // % del sueldo que se recupera por horas en eventos; el resto va al bote de fijos.
  repartoEventosPct: number;
  // Eventos al mes entre los que se reparte el bote de fijos.
  eventosMes: number;
  contingenciaPct: number; // imprevistos sobre costes directos
  mermasPct: number; // roturas/mermas sobre materiales
  costeHoraSocio: number; // tarifa nominal si un socio hace montaje (aportado)
  comisiones: { alquiler: number; boda: number; corporativo: number };
  margenes: {
    alta: { verde: number; ideal: number };
    media: { verde: number; ideal: number };
    baja: { verde: number; ideal: number };
  };
  mesesAlta: number[]; // 1-12
  mesesMedia: number[]; // el resto = baja
  tramos: {
    pequenoMax: number; // base < esto → pequeño
    grandeMin: number; // base ≥ esto → grande
    muyGrandeMin: number; // base ≥ esto → muy grande
    ajustePequeno: number; // puntos de margen que SUMA un evento pequeño
    ajusteGrande: number; // puntos que resta (negativo)
    ajusteMuyGrande: number;
    beneficioMinimo: number; // € mínimos de beneficio en eventos pequeños
  };
  horasPorTipo: Record<string, FaseHoras>; // precarga por tipo de evento
  redondeo: number; // redondeo comercial del precio sugerido (€)
  // Los alquileres apenas consumen estructura: llevan solo este % de la cuota.
  cuotaAlquilerPct: number;
};

export const CALCULADORA_DEFAULTS: CalculadoraConfig = {
  costeHoraEmpleada: 20,
  costeMensualEmpleada: 2170,
  repartoEventosPct: 50,
  eventosMes: 6,
  contingenciaPct: 5,
  mermasPct: 3,
  costeHoraSocio: 12,
  comisiones: { alquiler: 5, boda: 6, corporativo: 7 },
  margenes: {
    alta: { verde: 40, ideal: 45 },
    media: { verde: 35, ideal: 40 },
    baja: { verde: 25, ideal: 30 },
  },
  mesesAlta: [5, 6, 9, 10, 12],
  mesesMedia: [4, 7, 11],
  tramos: {
    pequenoMax: 1500,
    grandeMin: 4000,
    muyGrandeMin: 8000,
    ajustePequeno: 5,
    ajusteGrande: -5,
    ajusteMuyGrande: -10,
    beneficioMinimo: 400,
  },
  horasPorTipo: {
    boda: { comercial: 6, pre: 12, durante: 10, post: 4 },
    corporativo: { comercial: 3, pre: 6, durante: 5, post: 2 },
    comunion: { comercial: 3, pre: 8, durante: 6, post: 3 },
    cumpleanos: { comercial: 2, pre: 5, durante: 4, post: 2 },
    bautizo: { comercial: 2, pre: 5, durante: 4, post: 2 },
    navidad: { comercial: 3, pre: 8, durante: 6, post: 3 },
    alquiler_encargo: { comercial: 1, pre: 1, durante: 1, post: 1 },
    otro: { comercial: 3, pre: 6, durante: 5, post: 2 },
  },
  redondeo: 10,
  cuotaAlquilerPct: 25,
};

// Mezcla la config guardada (parcial) con los valores por defecto, tolerando
// campos ausentes, nulos o corruptos (nunca deja arrays nulos ni fases a medias).
export function mezclarConfig(guardada: unknown): CalculadoraConfig {
  const g = (guardada && typeof guardada === "object" ? guardada : {}) as Partial<CalculadoraConfig>;
  const arr = (v: unknown, def: number[]) => (Array.isArray(v) ? v.filter((x) => Number.isFinite(x)) : def);
  // Cada tipo de evento conserva sus 4 fases (una entrada parcial no deja huecos).
  const horas: Record<string, FaseHoras> = { ...CALCULADORA_DEFAULTS.horasPorTipo };
  const gh = (g.horasPorTipo ?? {}) as Record<string, Partial<FaseHoras>>;
  for (const k of Object.keys(gh)) {
    const base = CALCULADORA_DEFAULTS.horasPorTipo[k] ?? CALCULADORA_DEFAULTS.horasPorTipo.otro;
    horas[k] = { ...base, ...(gh[k] ?? {}) };
  }
  return {
    ...CALCULADORA_DEFAULTS,
    ...g,
    comisiones: { ...CALCULADORA_DEFAULTS.comisiones, ...(g.comisiones ?? {}) },
    margenes: {
      alta: { ...CALCULADORA_DEFAULTS.margenes.alta, ...(g.margenes?.alta ?? {}) },
      media: { ...CALCULADORA_DEFAULTS.margenes.media, ...(g.margenes?.media ?? {}) },
      baja: { ...CALCULADORA_DEFAULTS.margenes.baja, ...(g.margenes?.baja ?? {}) },
    },
    tramos: { ...CALCULADORA_DEFAULTS.tramos, ...(g.tramos ?? {}) },
    mesesAlta: arr(g.mesesAlta, CALCULADORA_DEFAULTS.mesesAlta),
    mesesMedia: arr(g.mesesMedia, CALCULADORA_DEFAULTS.mesesMedia),
    horasPorTipo: horas,
  };
}

export type Temporada = "alta" | "media" | "baja";

export function temporadaDeFecha(fechaEvento: string | null | undefined, cfg: CalculadoraConfig): Temporada {
  const mes = fechaEvento ? Number(fechaEvento.slice(5, 7)) : new Date().getMonth() + 1;
  if (cfg.mesesAlta.includes(mes)) return "alta";
  if (cfg.mesesMedia.includes(mes)) return "media";
  return "baja";
}

// % de comisión según la operación (serie/tipo de evento).
export function comisionPct(serie: string | null | undefined, tipoEvento: string | null | undefined, cfg: CalculadoraConfig): number {
  if (serie === "alquiler_encargo") return cfg.comisiones.alquiler;
  if (tipoEvento === "corporativo") return cfg.comisiones.corporativo;
  return cfg.comisiones.boda;
}

// Bote mensual de fijos (sin sueldos): fijos activos vigentes en el mes del
// evento, normalizados a €/mes según su periodicidad. Se calcula en servidor.
export function boteFijosMes(
  gastosFijos: {
    importe_mensual: number;
    periodicidad: string;
    activo: boolean;
    categoria?: string | null;
    desde?: string | null;
    hasta?: string | null;
  }[],
  mesEvento: string, // YYYY-MM
): number {
  let bote = 0;
  for (const g of gastosFijos) {
    if (!g.activo) continue;
    if (g.categoria === "sueldo") continue; // los sueldos van por horas + reparto
    if (g.desde && g.desde.slice(0, 7) > mesEvento) continue;
    if (g.hasta && g.hasta.slice(0, 7) < mesEvento) continue;
    const imp = Number(g.importe_mensual);
    bote += g.periodicidad === "anual" ? imp / 12 : g.periodicidad === "trimestral" ? imp / 3 : imp;
  }
  return bote;
}

// Cuota por evento = (bote de fijos + parte estructural del sueldo) ÷ eventos/mes.
// Va aparte del bote para poder recalcularse en vivo al probar parámetros.
export function cuotaPorEvento(bote: number, cfg: CalculadoraConfig): number {
  const estructural = cfg.costeMensualEmpleada * (1 - cfg.repartoEventosPct / 100);
  return (bote + estructural) / Math.max(1, cfg.eventosMes);
}

// Una persona más en el evento (además de la empleada principal): socio,
// colaborador o externo. Si es "aportado", su coste cuenta para el precio
// pero nadie lo cobra (trabajo regalado por un socio).
export type PersonaLinea = { nombre: string; horas: number; precioHora: number; aportado: boolean };

export type CalculoInputs = {
  horas: FaseHoras; // horas de Cristina por fase
  personas?: PersonaLinea[]; // resto de personas (desplegable del equipo)
  // Campos antiguos (cálculos guardados antes de las líneas de persona):
  horasSocio?: number;
  personalExtra?: number;
  materiales: number; // € materiales/subcontratas
  transporte: number; // € furgoneta + gasolina + km
  // Precio tope del cliente (opcional): "tengo X € y punto" → la calculadora
  // trabaja al revés: cuánto coste te puedes permitir para ese precio.
  precioTope?: number | null;
};

// Análisis del precio tope: qué margen sale y a cuánto deben bajar los costes.
export type AnalisisTope = {
  precio: number;
  semaforo: "verde" | "ambar" | "rojo";
  margenPct: number; // margen real con los costes actuales a ese precio
  beneficio: number; // € con los costes actuales
  costeMaxVerde: number; // coste total admisible para quedar en verde
  costeMaxIdeal: number; // coste admisible para el margen ideal
  recorteParaVerde: number; // >0 = hay que recortar tanto; <=0 = holgura
};

export type CalculoResultado = {
  temporada: Temporada;
  comisionPct: number;
  tamano: "pequeno" | "medio" | "grande" | "muy_grande";
  margenVerde: number; // % ya ajustado por tamaño
  margenIdeal: number;
  desglose: {
    horasCristina: number;
    costeCristina: number;
    costeSocio: number;
    personalExtra: number;
    materiales: number;
    transporte: number;
    contingencia: number;
    mermas: number;
    cuotaFijos: number;
  };
  costeTotal: number; // sin comisión (la comisión depende del precio)
  precioSupervivencia: number; // directos + comisión (sin fijos) — solo temporada baja
  precioMinimo: number; // coste total + comisión
  precioVerde: number; // desde aquí, semáforo verde
  precioSugerido: number; // ideal, redondeado comercialmente
  // Evaluación contra el presupuesto actual (si hay):
  presupuestoBase: number | null;
  margenPrevisto: number | null; // % sobre el precio actual
  beneficioPrevisto: number | null; // € con el precio actual
  beneficioPorHora: number | null; // €/hora de Cristina con el precio actual
  semaforo: "verde" | "ambar" | "rojo" | null;
  tope: AnalisisTope | null; // si el cliente puso precio tope
};

const redondeaArriba = (n: number, paso: number) => Math.ceil(n / Math.max(1, paso)) * Math.max(1, paso);

export function calcularPrecio(
  inputs: CalculoInputs,
  cfg: CalculadoraConfig,
  ctx: {
    serie: string | null | undefined;
    tipoEvento: string | null | undefined;
    fechaEvento: string | null | undefined;
    cuotaFijos: number;
    presupuestoBase: number | null;
  },
): CalculoResultado {
  const temporada = temporadaDeFecha(ctx.fechaEvento, cfg);
  const com = comisionPct(ctx.serie, ctx.tipoEvento, cfg) / 100;
  // Los alquileres cargan solo una fracción de la cuota de estructura.
  const cuotaFijos = ctx.cuotaFijos * (ctx.serie === "alquiler_encargo" ? cfg.cuotaAlquilerPct / 100 : 1);

  // Divisor precio = 1 − margen − comisión, acotado para no dar precios absurdos
  // ni negativos si en Ajustes se ponen márgenes/comisiones muy altos.
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, x) : 0; // sin NaN ni negativos
  };
  const factor = (margenPct: number) => Math.max(0.05, 1 - margenPct / 100 - com);

  const horasCristina = n(inputs.horas?.comercial) + n(inputs.horas?.pre) + n(inputs.horas?.durante) + n(inputs.horas?.post);
  const costeCristina = horasCristina * cfg.costeHoraEmpleada;
  // Resto de personas: aportadas (socios que no cobran) y pagadas (extras). Si
  // hay líneas de persona se ignoran los campos viejos (evita doble conteo).
  const personas = inputs.personas ?? [];
  const soloViejo = personas.length === 0;
  const costeAportado =
    personas.filter((p) => p.aportado).reduce((s, p) => s + n(p.horas) * n(p.precioHora), 0) +
    (soloViejo ? n(inputs.horasSocio) * cfg.costeHoraSocio : 0);
  const costePagado =
    personas.filter((p) => !p.aportado).reduce((s, p) => s + n(p.horas) * n(p.precioHora), 0) +
    (soloViejo ? n(inputs.personalExtra) : 0);
  const materiales = n(inputs.materiales);
  const directosSinExtras =
    costeCristina + costeAportado + costePagado + materiales + n(inputs.transporte);
  const contingencia = (directosSinExtras * cfg.contingenciaPct) / 100;
  const mermas = (materiales * cfg.mermasPct) / 100;
  const directos = directosSinExtras + contingencia + mermas;
  const costeTotal = directos + cuotaFijos;

  // Tamaño del evento por su MAGNITUD intrínseca (precio natural por costes), no
  // por lo que ofrezca el cliente: así el precio sugerido es objetivo y estable.
  const margenBase = cfg.margenes[temporada];
  const sugeridoSinAjuste = costeTotal / factor(margenBase.ideal);
  const baseRef = sugeridoSinAjuste;
  const tamano =
    baseRef >= cfg.tramos.muyGrandeMin ? "muy_grande"
    : baseRef >= cfg.tramos.grandeMin ? "grande"
    : baseRef < cfg.tramos.pequenoMax ? "pequeno"
    : "medio";
  const ajuste =
    tamano === "pequeno" ? cfg.tramos.ajustePequeno
    : tamano === "grande" ? cfg.tramos.ajusteGrande
    : tamano === "muy_grande" ? cfg.tramos.ajusteMuyGrande
    : 0;

  const margenVerde = margenBase.verde + ajuste;
  const margenIdeal = margenBase.ideal + ajuste;

  const precioMinimo = costeTotal / Math.max(0.05, 1 - com);
  const precioSupervivencia = directos / Math.max(0.05, 1 - com);
  let precioVerde = costeTotal / factor(margenVerde);
  let precioSugerido = costeTotal / factor(margenIdeal);
  // Beneficio mínimo en euros para eventos pequeños: no compensar jaleo barato.
  if (tamano === "pequeno" && ctx.serie !== "alquiler_encargo") {
    const suelo = (costeTotal + cfg.tramos.beneficioMinimo) / Math.max(0.05, 1 - com);
    precioVerde = Math.max(precioVerde, suelo);
    precioSugerido = Math.max(precioSugerido, suelo);
  }
  // Coherencia: verde nunca por debajo del mínimo, ni el sugerido por debajo del verde.
  precioVerde = Math.max(precioVerde, precioMinimo);
  precioSugerido = Math.max(precioSugerido, precioVerde);
  precioSugerido = redondeaArriba(precioSugerido, cfg.redondeo);
  precioVerde = redondeaArriba(precioVerde, cfg.redondeo);

  // Evaluación contra el presupuesto actual.
  const base = ctx.presupuestoBase && ctx.presupuestoBase > 0 ? ctx.presupuestoBase : null;
  let margenPrevisto: number | null = null;
  let beneficioPrevisto: number | null = null;
  let beneficioPorHora: number | null = null;
  let semaforo: CalculoResultado["semaforo"] = null;
  if (base != null) {
    beneficioPrevisto = base * (1 - com) - costeTotal;
    margenPrevisto = (beneficioPrevisto / base) * 100;
    beneficioPorHora = horasCristina > 0 ? beneficioPrevisto / horasCristina : null;
    const sueloRojo = temporada === "baja" ? precioSupervivencia : precioMinimo;
    semaforo = base >= precioVerde ? "verde" : base >= sueloRojo ? "ambar" : "rojo";
  }

  // Precio tope del cliente: cálculo inverso (precio → coste admisible).
  let tope: AnalisisTope | null = null;
  const precioTope = n(inputs.precioTope);
  if (precioTope > 0) {
    const beneficioTope = precioTope * (1 - com) - costeTotal;
    const sueloRojo = temporada === "baja" ? precioSupervivencia : precioMinimo;
    // Coste admisible = precio × (1 − margen − comisión), acotado a ≥ 0.
    const costeMaxVerde = Math.max(0, precioTope * (1 - margenVerde / 100 - com));
    const costeMaxIdeal = Math.max(0, precioTope * (1 - margenIdeal / 100 - com));
    tope = {
      precio: precioTope,
      // Mismo criterio de suelo redondeado que el semáforo principal (coherencia).
      semaforo: precioTope >= precioVerde ? "verde" : precioTope >= sueloRojo ? "ambar" : "rojo",
      margenPct: (beneficioTope / precioTope) * 100,
      beneficio: beneficioTope,
      costeMaxVerde,
      costeMaxIdeal,
      recorteParaVerde: costeTotal - costeMaxVerde,
    };
  }

  return {
    temporada,
    comisionPct: com * 100,
    tamano,
    margenVerde,
    margenIdeal,
    desglose: {
      horasCristina,
      costeCristina,
      costeSocio: costeAportado,
      personalExtra: costePagado,
      materiales: Number(inputs.materiales),
      transporte: Number(inputs.transporte),
      contingencia,
      mermas,
      cuotaFijos,
    },
    costeTotal,
    precioSupervivencia,
    precioMinimo,
    precioVerde,
    precioSugerido,
    presupuestoBase: base,
    margenPrevisto,
    beneficioPrevisto,
    beneficioPorHora,
    semaforo,
    tope,
  };
}
