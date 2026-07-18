import type { Sueldo } from "@/lib/types";

// 52 semanas / 12 meses = 4,3333 semanas por mes. Convierte las horas de
// contrato semanales en horas al mes para pasar el sueldo mensual a €/hora.
export const SEMANAS_POR_MES = 52 / 12;

// Sueldo vigente en un mes (YYYY-MM): el de la fecha 'desde' más reciente que
// no lo supere.
export function sueldoVigente(sueldos: Sueldo[], mes: string): Sueldo | null {
  const tope = `${mes}-01`;
  const orden = sueldos
    .filter((s) => s.desde <= tope)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1));
  return orden[0] ?? null;
}

// Coste real por hora de una persona del equipo en una fecha dada.
//  - Si tiene horas de contrato y un sueldo vigente ese mes, se deriva:
//    sueldo del mes ÷ (horas_semana × 52/12). Así sigue automáticamente los
//    cambios de sueldo (p. ej. temporada baja vs. alta).
//  - Si no, cae al €/hora fijo de su ficha (colaboradores externos).
//  - null si no hay ningún dato del que sacar el coste.
export function costeHoraVigente(
  persona: { id: string; horas_semana?: number | null; precio_hora?: number | null },
  sueldos: Sueldo[],
  fechaISO: string | null | undefined,
): number | null {
  const mes = (fechaISO ?? "").slice(0, 7);
  const horasMes = persona.horas_semana ? Number(persona.horas_semana) * SEMANAS_POR_MES : 0;
  if (mes && horasMes > 0) {
    const s = sueldoVigente(
      sueldos.filter((x) => x.equipo_id === persona.id),
      mes,
    );
    if (s && s.importe > 0) return Math.round((s.importe / horasMes) * 100) / 100;
  }
  return persona.precio_hora ?? null;
}
