import type { ChecklistGrupo, ChecklistItem } from "./types";

// Deja los pasos en forma canónica: texto recortado, sin vacíos.
function limpiarItems(items: ChecklistItem[] | undefined | null): ChecklistItem[] {
  return (items ?? [])
    .map((it) => ({ texto: (it?.texto ?? "").trim(), hecho: Boolean(it?.hecho) }))
    .filter((it) => it.texto.length > 0);
}

// Normaliza el valor guardado (columna `checklist`) a ChecklistGrupo[].
// Tolera el formato antiguo (lista plana de items), envolviéndolo en un grupo.
export function normalizarChecklist(raw: unknown): ChecklistGrupo[] {
  if (!Array.isArray(raw)) return [];
  const esFormatoAntiguo =
    raw.length > 0 &&
    raw.every((x) => x && typeof x === "object" && "texto" in x && !("items" in x));
  if (esFormatoAntiguo) {
    const items = limpiarItems(raw as ChecklistItem[]);
    return items.length ? [{ titulo: "", items }] : [];
  }
  return (raw as ChecklistGrupo[])
    .map((g) => ({ titulo: (g?.titulo ?? "").trim(), items: limpiarItems(g?.items) }))
    .filter((g) => g.titulo.length > 0 || g.items.length > 0);
}

// Recuento total de pasos y hechos, con porcentaje.
export function contarChecklist(grupos: ChecklistGrupo[]) {
  let total = 0;
  let hechos = 0;
  for (const g of grupos) {
    for (const it of g.items) {
      total++;
      if (it.hecho) hechos++;
    }
  }
  return {
    total,
    hechos,
    pct: total ? Math.round((hechos / total) * 100) : 0,
    completa: total > 0 && hechos === total,
  };
}
