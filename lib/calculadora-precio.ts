// ============================================================================
// Calculadora de precio por oportunidad (modelo acordado por los socios).
// El motor es "complejo por dentro, simple por fuera": Cristina solo ve el
// semáforo y los precios; todos estos parámetros viven en Ajustes y se pueden
// probar/cambiar sin tocar código.
// ============================================================================

export type FaseHoras = { comercial: number; pre: number; durante: number; post: number };

export type CalculadoraConfig = {
  // Cristina (empleada): coste empresa por hora y al mes (bruto + SS). El
  // coste/hora es la media ANUAL alisada (decisión socios: tarifa estable todo
  // el año, sin encarecer el verano por tener pocos eventos).
  costeHoraEmpleada: number;
  costeMensualEmpleada: number;
  // % de las horas de la empleada que se dedican a eventos (referencia de
  // partida: 50%). De aquí sale la tarifa cargada: coste/hora ÷ este % — cada
  // hora de evento arrastra su parte proporcional del resto de la jornada
  // (admin, presupuestos, taller). Si dedica MÁS horas a eventos, sube este %
  // y el recargo de estructura BAJA solo.
  repartoEventosPct: number;
  // Eventos al mes entre los que se reparte el bote de fijos. Referencia fija
  // de partida: 6 (decisión socios — mejor pasarse que quedarse cortos; el
  // Cuadro de mando enseña la desviación real de cada mes).
  eventosMes: number;
  contingenciaPct: number; // imprevistos sobre costes directos
  mermasPct: number; // roturas/mermas sobre materiales
  // Estructura que carga un encargo/alquiler: un % de sus costes directos (uso
  // de taller/local), en vez de la cuota completa de un evento. 0 = nada.
  estructuraEncargoPct: number;
  costeHoraSocio: number; // tarifa nominal si un socio hace montaje (aportado)
  comisiones: { alquiler: number; boda: number; corporativo: number };
  margenes: {
    alta: { verde: number; ideal: number };
    media: { verde: number; ideal: number };
    baja: { verde: number; ideal: number };
  };
  // Banda de margen propia por tipo de evento: pisa la de temporada. Los
  // corporativos van del 15 (verde) al 45 (ideal): aceptan margen bajo porque
  // amortizan estructura, pero se intenta vender arriba.
  margenesPorTipo: Record<string, { verde: number; ideal: number }>;
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
  // Pautas comerciales: mínimo de proyecto para servicios con desplazamiento
  // (furgoneta + montaje + desmontaje), sobre la base imponible; y cargo de
  // entrega para piezas sueltas que se llevan sin montaje (cartel, etc.).
  minimoDesplazado: number;
  cargoEntrega: number;
  // Precarga de COSTES por tipo de evento (plan previsto de la pestaña Costes).
  // Mismo patrón que horasPorTipo: valores orientativos, editables por el equipo.
  manoObraPorTipo: Record<string, { montaje: number; durante: number; desmontaje: number }>;
  transportePorTipo: Record<string, { km: number }>;
  dietasPorTipo: Record<string, { personas: number; precioPorPersona: number }>;
  materialesPorTipo: Record<string, { concepto: string; cantidad: number; precioUnitario: number }[]>;
};

export const CALCULADORA_DEFAULTS: CalculadoraConfig = {
  costeHoraEmpleada: 20,
  costeMensualEmpleada: 2170,
  repartoEventosPct: 50,
  eventosMes: 6,
  // 6% de referencia: incluye imprevistos, inflación de materiales y también
  // las roturas/mermas (decisión jul 2026: las mermas van dentro, no aparte).
  contingenciaPct: 6,
  mermasPct: 0,
  // 20% desde jul 2026 (antes 15): los encargos también consumen local/taller.
  estructuraEncargoPct: 20,
  costeHoraSocio: 12,
  comisiones: { alquiler: 5, boda: 6, corporativo: 7 },
  // Margen sobre el precio. El sugerido es el "ideal" (30% de referencia): como
  // el coste ya lleva la estructura completa (horas cargadas + cuota), por
  // encima del MÍNIMO cada punto es beneficio limpio. El 45% sigue disponible en
  // la tabla de opciones para quien quiera apretar en temporada alta.
  margenes: {
    alta: { verde: 20, ideal: 30 },
    media: { verde: 20, ideal: 30 },
    baja: { verde: 15, ideal: 25 },
  },
  // Corporativo: banda propia que pisa la de temporada. Aceptan margen bajo
  // (verde desde 15) porque amortizan estructura; sugerido al 30 como el resto
  // (decisión socios jul 2026 — antes se sugería 45).
  margenesPorTipo: {
    corporativo: { verde: 15, ideal: 30 },
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
  minimoDesplazado: 450,
  cargoEntrega: 75,
  // Horas de Cristina: SIN precarga (decisión jul 2026: "habrá bodas y bodas").
  // Cristina mete las horas reales de cada evento; no se arrastra un número
  // inventado por tipo. Editable en Ajustes si alguna vez se quiere precargar.
  horasPorTipo: {
    boda: { comercial: 0, pre: 0, durante: 0, post: 0 },
    corporativo: { comercial: 0, pre: 0, durante: 0, post: 0 },
    comunion: { comercial: 0, pre: 0, durante: 0, post: 0 },
    cumpleanos: { comercial: 0, pre: 0, durante: 0, post: 0 },
    bautizo: { comercial: 0, pre: 0, durante: 0, post: 0 },
    navidad: { comercial: 0, pre: 0, durante: 0, post: 0 },
    alquiler_encargo: { comercial: 0, pre: 0, durante: 0, post: 0 },
    otro: { comercial: 0, pre: 0, durante: 0, post: 0 },
  },
  redondeo: 10,
  manoObraPorTipo: {
    boda: { montaje: 12, durante: 10, desmontaje: 4 },
    corporativo: { montaje: 6, durante: 5, desmontaje: 2 },
    comunion: { montaje: 8, durante: 6, desmontaje: 3 },
    cumpleanos: { montaje: 5, durante: 4, desmontaje: 2 },
    bautizo: { montaje: 5, durante: 4, desmontaje: 2 },
    navidad: { montaje: 8, durante: 6, desmontaje: 3 },
    alquiler_encargo: { montaje: 1, durante: 0, desmontaje: 1 },
    otro: { montaje: 6, durante: 5, desmontaje: 2 },
  },
  transportePorTipo: {
    boda: { km: 120 },
    corporativo: { km: 80 },
    comunion: { km: 80 },
    cumpleanos: { km: 40 },
    bautizo: { km: 40 },
    navidad: { km: 60 },
    alquiler_encargo: { km: 40 },
    otro: { km: 60 },
  },
  dietasPorTipo: {
    boda: { personas: 3, precioPorPersona: 12 },
    corporativo: { personas: 2, precioPorPersona: 12 },
    comunion: { personas: 2, precioPorPersona: 10 },
    cumpleanos: { personas: 1, precioPorPersona: 10 },
    bautizo: { personas: 1, precioPorPersona: 10 },
    navidad: { personas: 2, precioPorPersona: 10 },
    alquiler_encargo: { personas: 0, precioPorPersona: 0 },
    otro: { personas: 1, precioPorPersona: 10 },
  },
  materialesPorTipo: {
    boda: [
      { concepto: "Flores y centros", cantidad: 1, precioUnitario: 300 },
      { concepto: "Velas y fungibles", cantidad: 1, precioUnitario: 80 },
    ],
    corporativo: [{ concepto: "Materiales de decoración", cantidad: 1, precioUnitario: 150 }],
    comunion: [{ concepto: "Flores y decoración", cantidad: 1, precioUnitario: 150 }],
    cumpleanos: [{ concepto: "Materiales de decoración", cantidad: 1, precioUnitario: 100 }],
    bautizo: [{ concepto: "Materiales de decoración", cantidad: 1, precioUnitario: 100 }],
    navidad: [{ concepto: "Materiales navideños", cantidad: 1, precioUnitario: 150 }],
    alquiler_encargo: [],
    otro: [{ concepto: "Materiales de decoración", cantidad: 1, precioUnitario: 100 }],
  },
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
  // Merge tolerante de los diccionarios de precarga de costes por tipo.
  const mergePorTipo = <T,>(def: Record<string, T>, guar: unknown): Record<string, T> => {
    const out: Record<string, T> = { ...def };
    const gg = (guar && typeof guar === "object" ? guar : {}) as Record<string, Partial<T>>;
    for (const k of Object.keys(gg)) {
      const base = def[k] ?? def.otro;
      out[k] = { ...(base as object), ...(gg[k] ?? {}) } as T;
    }
    return out;
  };
  const materiales: CalculadoraConfig["materialesPorTipo"] = { ...CALCULADORA_DEFAULTS.materialesPorTipo };
  const gmat = (g.materialesPorTipo ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(gmat)) if (Array.isArray(gmat[k])) materiales[k] = gmat[k] as (typeof materiales)[string];
  return {
    ...CALCULADORA_DEFAULTS,
    ...g,
    comisiones: { ...CALCULADORA_DEFAULTS.comisiones, ...(g.comisiones ?? {}) },
    margenes: {
      alta: { ...CALCULADORA_DEFAULTS.margenes.alta, ...(g.margenes?.alta ?? {}) },
      media: { ...CALCULADORA_DEFAULTS.margenes.media, ...(g.margenes?.media ?? {}) },
      baja: { ...CALCULADORA_DEFAULTS.margenes.baja, ...(g.margenes?.baja ?? {}) },
    },
    margenesPorTipo: mergePorTipo(CALCULADORA_DEFAULTS.margenesPorTipo, g.margenesPorTipo),
    tramos: { ...CALCULADORA_DEFAULTS.tramos, ...(g.tramos ?? {}) },
    mesesAlta: arr(g.mesesAlta, CALCULADORA_DEFAULTS.mesesAlta),
    mesesMedia: arr(g.mesesMedia, CALCULADORA_DEFAULTS.mesesMedia),
    horasPorTipo: horas,
    manoObraPorTipo: mergePorTipo(CALCULADORA_DEFAULTS.manoObraPorTipo, g.manoObraPorTipo),
    transportePorTipo: mergePorTipo(CALCULADORA_DEFAULTS.transportePorTipo, g.transportePorTipo),
    dietasPorTipo: mergePorTipo(CALCULADORA_DEFAULTS.dietasPorTipo, g.dietasPorTipo),
    materialesPorTipo: materiales,
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

// Sueldos del mes (lo contrario del bote): SOLO los gastos fijos de categoría
// "sueldo" vigentes en el mes, normalizados a €/mes, con los equipo_id de sus
// beneficiarios. Sirve para el panel de cobertura: la parte del sueldo aún no
// recuperada por horas imputadas = sueldo del mes − partes de esas personas.
export function sueldosFijosMes(
  gastosFijos: {
    importe_mensual: number;
    periodicidad: string;
    activo: boolean;
    categoria?: string | null;
    equipo_id?: string | null;
    desde?: string | null;
    hasta?: string | null;
  }[],
  mesEvento: string, // YYYY-MM
): { total: number; equipoIds: string[] } {
  let total = 0;
  const ids = new Set<string>();
  for (const g of gastosFijos) {
    if (!g.activo || g.categoria !== "sueldo") continue;
    if (g.desde && g.desde.slice(0, 7) > mesEvento) continue;
    if (g.hasta && g.hasta.slice(0, 7) < mesEvento) continue;
    const imp = Number(g.importe_mensual);
    total += g.periodicidad === "anual" ? imp / 12 : g.periodicidad === "trimestral" ? imp / 3 : imp;
    if (g.equipo_id) ids.add(g.equipo_id);
  }
  return { total, equipoIds: Array.from(ids) };
}

// Cuota por evento = bote de fijos ÷ eventos de referencia al mes. El sueldo ya
// NO entra aquí: se recupera entero por horas con la tarifa cargada (abajo).
// Modelo por consumo (decisión socios jul 2026): un evento de 12 h carga más
// estructura que uno de 2 h, y la cuota solo lleva los fijos "de plaza"
// (local, trastero, software), que no dependen de las horas.
export function cuotaPorEvento(bote: number, cfg: CalculadoraConfig): number {
  return bote / Math.max(1, cfg.eventosMes);
}

// Tarifa cargada de la empleada: su sueldo entero se recupera SOLO por las
// horas que dedica a eventos. Si dedica el 50% de la jornada, cada hora de
// evento debe arrastrar dos horas de sueldo → tarifa = coste real ÷ 50%
// (20 €/h → 40 €/h). Si dedica más horas a eventos, la tarifa baja sola.
export function tarifaCargadaHora(cfg: CalculadoraConfig): number {
  const r = Math.min(100, Math.max(5, Number(cfg.repartoEventosPct) || 50)) / 100;
  return cfg.costeHoraEmpleada / r;
}

// Recargo de estructura por hora de evento = tarifa cargada − coste real.
export function recargoEstructuraHora(cfg: CalculadoraConfig): number {
  return Math.max(0, tarifaCargadaHora(cfg) - cfg.costeHoraEmpleada);
}

// Una persona más en el evento (además de la empleada principal): socio,
// colaborador o externo. Si es "aportado", su coste cuenta para el precio
// pero nadie lo cobra (trabajo regalado por un socio). "esEmpleada" marca a la
// empleada con sueldo cuando viene como línea (flujo de Costes): sus horas
// llevan el recargo de estructura igual que las del bloque de horas.
export type PersonaLinea = { nombre: string; horas: number; precioHora: number; aportado: boolean; esEmpleada?: boolean };

// Un gasto del evento desglosado (mismo patrón que las líneas de persona):
// materiales, transporte o dietas/alquiler, con su concepto e importe.
export type GastoLinea = { concepto: string; tipo: "materiales" | "transporte" | "otros"; importe: number };

export type CalculoInputs = {
  horas: FaseHoras; // horas de Cristina por fase
  personas?: PersonaLinea[]; // resto de personas (desplegable del equipo)
  // Gastos desglosados línea a línea (si existen, mandan sobre los números
  // sueltos de abajo — mismo patrón de compatibilidad que personas).
  gastos?: GastoLinea[];
  // Campos antiguos (cálculos guardados antes de las líneas de persona):
  horasSocio?: number;
  personalExtra?: number;
  materiales: number; // € materiales/subcontratas
  transporte: number; // € furgoneta + gasolina + km
  otros?: number; // € dietas, alquiler externo…
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
    otros: number;
    contingencia: number;
    mermas: number;
    recargoEstructura: number; // horas × recargo de tarifa cargada (0 en encargos)
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
  // Mínimo de proyecto aplicado por ser servicio con desplazamiento (o null).
  minimoDesplazado: number | null;
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
  // La temporada (alta/baja) solo afecta a las BODAS: son las que tienen pico
  // de demanda estacional. El resto (corporativo, comunión, alquiler…) va a
  // temporada media, sin ajuste por fecha.
  const temporada: Temporada = ctx.tipoEvento === "boda" ? temporadaDeFecha(ctx.fechaEvento, cfg) : "media";
  const com = comisionPct(ctx.serie, ctx.tipoEvento, cfg) / 100;
  const esAlquiler = ctx.serie === "alquiler_encargo";

  // Divisor precio = 1 − margen − comisión, acotado para no dar precios absurdos
  // ni negativos si en Ajustes se ponen márgenes/comisiones muy altos.
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, x) : 0; // sin NaN ni negativos
  };
  const factor = (margenPct: number) => Math.max(0.05, 1 - margenPct / 100 - com);

  const horasCristina = n(inputs.horas?.comercial) + n(inputs.horas?.pre) + n(inputs.horas?.durante) + n(inputs.horas?.post);
  const costeCristinaBloque = horasCristina * cfg.costeHoraEmpleada;
  const personas = inputs.personas ?? [];
  const soloViejo = personas.length === 0;
  // La empleada (Cristina) puede venir por el bloque de horas O como línea de
  // persona (flujo de Costes, donde el bloque queda a cero). Se la reconoce por
  // el flag esEmpleada o, en cálculos antiguos, por el nombre — "Cris" (socia)
  // no cuela en /crist/i. Sus horas y su coste van SIEMPRE al cubo de la
  // empleada, nunca a "personal extra".
  const esEmpleadaLinea = (p: PersonaLinea) => p.esEmpleada ?? /crist/i.test(p.nombre);
  const lineasEmpleada = personas.filter(esEmpleadaLinea);
  const otrasPersonas = personas.filter((p) => !esEmpleadaLinea(p));
  const horasEmpleada = horasCristina + lineasEmpleada.reduce((s, p) => s + n(p.horas), 0);
  const costeCristina =
    costeCristinaBloque + lineasEmpleada.reduce((s, p) => s + n(p.horas) * n(p.precioHora), 0);
  // Resto de personas: aportadas (socios que no cobran) y pagadas (extras). Si
  // hay líneas de persona se ignoran los campos viejos (evita doble conteo).
  const costeAportado =
    otrasPersonas.filter((p) => p.aportado).reduce((s, p) => s + n(p.horas) * n(p.precioHora), 0) +
    (soloViejo ? n(inputs.horasSocio) * cfg.costeHoraSocio : 0);
  const costePagado =
    otrasPersonas.filter((p) => !p.aportado).reduce((s, p) => s + n(p.horas) * n(p.precioHora), 0) +
    (soloViejo ? n(inputs.personalExtra) : 0);
  // Gastos: si hay líneas desglosadas mandan ellas; si no, los números sueltos.
  const gastos = inputs.gastos ?? [];
  const sumaGastos = (tipo: GastoLinea["tipo"]) =>
    gastos.filter((g) => g.tipo === tipo).reduce((s, g) => s + n(g.importe), 0);
  const materiales = gastos.length > 0 ? sumaGastos("materiales") : n(inputs.materiales);
  const transporte = gastos.length > 0 ? sumaGastos("transporte") : n(inputs.transporte);
  const otros = gastos.length > 0 ? sumaGastos("otros") : n(inputs.otros);
  const directosSinExtras =
    costeCristina + costeAportado + costePagado + materiales + transporte + otros;
  const contingencia = (directosSinExtras * cfg.contingenciaPct) / 100;
  // Las mermas (roturas) solo aplican a materiales físicos, no a dietas/alquiler.
  const mermas = (materiales * cfg.mermasPct) / 100;
  const directos = directosSinExtras + contingencia + mermas;
  // Estructura por consumo (decisión socios jul 2026):
  //  · Un EVENTO carga estructura según lo que consume: sus horas de Cristina
  //    llevan el recargo de la tarifa cargada (el sueldo entero se recupera por
  //    horas: 12 h cargan 6 veces más que 2 h) + la cuota de fijos "de plaza"
  //    (bote sin sueldo ÷ eventos de referencia). Sin contingencia encima: la
  //    contingencia es para costes directos, no para estructura.
  //  · Un ENCARGO/ALQUILER solo carga un % de sus costes directos (uso de
  //    taller/local), no la máquina de un evento; sus horas van a coste real.
  //    Lo que recaudan ayuda al bote (se ve en el Cuadro de mando).
  // El recargo de estructura se aplica a TODAS las horas de la empleada (bloque
  // + líneas); los encargos/alquileres no lo llevan (sus horas van a coste real).
  const recargoEstructura = esAlquiler ? 0 : horasEmpleada * recargoEstructuraHora(cfg);
  const cuotaFijos = esAlquiler
    ? (directosSinExtras * n(cfg.estructuraEncargoPct)) / 100
    : ctx.cuotaFijos;
  const costeTotal = directos + recargoEstructura + cuotaFijos;

  // Tamaño del evento por su MAGNITUD intrínseca (precio natural por costes), no
  // por lo que ofrezca el cliente: así el precio sugerido es objetivo y estable.
  // Si el tipo de evento tiene banda propia (corporativo: 15–45), pisa la de
  // temporada; solo se usa si está completa (verde e ideal numéricos).
  const porTipo = cfg.margenesPorTipo?.[ctx.tipoEvento ?? ""];
  const bandaTipo = Boolean(porTipo && Number.isFinite(porTipo.verde) && Number.isFinite(porTipo.ideal));
  const margenBase = bandaTipo ? porTipo! : cfg.margenes[temporada];
  const sugeridoSinAjuste = costeTotal / factor(margenBase.ideal);
  const baseRef = sugeridoSinAjuste;
  const tamano =
    baseRef >= cfg.tramos.muyGrandeMin ? "muy_grande"
    : baseRef >= cfg.tramos.grandeMin ? "grande"
    : baseRef < cfg.tramos.pequenoMax ? "pequeno"
    : "medio";
  // La banda por tipo (corporativo 15–45) es una decisión comercial exacta:
  // no se le suma el ajuste por tamaño. El suelo de beneficio mínimo en
  // eventos pequeños sí sigue aplicando (protege del jaleo barato).
  const ajuste = bandaTipo ? 0
    : tamano === "pequeno" ? cfg.tramos.ajustePequeno
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

  // Pauta comercial: si el servicio lleva desplazamiento (hay transporte),
  // el proyecto tiene un precio mínimo (base) por sacar furgoneta + montar +
  // desmontar. La recogida en estudio (transporte 0) no lo lleva.
  const minimoDesplazado =
    transporte > 0 && n(cfg.minimoDesplazado) > 0 ? n(cfg.minimoDesplazado) : null;
  if (minimoDesplazado) {
    precioVerde = Math.max(precioVerde, redondeaArriba(minimoDesplazado, cfg.redondeo));
    precioSugerido = Math.max(precioSugerido, precioVerde);
  }

  // Evaluación contra el presupuesto actual.
  const base = ctx.presupuestoBase && ctx.presupuestoBase > 0 ? ctx.presupuestoBase : null;
  let margenPrevisto: number | null = null;
  let beneficioPrevisto: number | null = null;
  let beneficioPorHora: number | null = null;
  let semaforo: CalculoResultado["semaforo"] = null;
  if (base != null) {
    beneficioPrevisto = base * (1 - com) - costeTotal;
    margenPrevisto = (beneficioPrevisto / base) * 100;
    beneficioPorHora = horasEmpleada > 0 ? beneficioPrevisto / horasEmpleada : null;
    const sueloRojo = temporada === "baja" ? precioSupervivencia : precioMinimo;
    semaforo = base >= precioVerde ? "verde" : base >= sueloRojo ? "ambar" : "rojo";
    // Por debajo del mínimo de servicio desplazado → rojo (pauta comercial).
    if (minimoDesplazado && base < minimoDesplazado) semaforo = "rojo";
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
      semaforo:
        minimoDesplazado && precioTope < minimoDesplazado
          ? "rojo"
          : precioTope >= precioVerde ? "verde" : precioTope >= sueloRojo ? "ambar" : "rojo",
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
      horasCristina: horasEmpleada,
      costeCristina,
      costeSocio: costeAportado,
      personalExtra: costePagado,
      materiales,
      transporte,
      otros,
      contingencia,
      mermas,
      recargoEstructura,
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
    minimoDesplazado,
  };
}
