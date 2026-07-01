import type { Reserva } from "@/lib/types";

// Estados de reserva que "ocupan" material.
const OCUPAN = ["reservado", "entregado"];

// ¿Solapan dos rangos de fechas? (inclusive). Si falta alguna fecha, se asume que sí.
export function solapan(
  s1: string | null,
  d1: string | null,
  s2: string | null,
  d2: string | null,
): boolean {
  if (!s1 || !d1 || !s2 || !d2) return true;
  return s1 <= d2 && s2 <= d1;
}

/**
 * Unidades disponibles de un artículo en un rango de fechas.
 * disponible = cantidad_total − Σ cantidades reservadas (reservado/entregado) que solapan.
 */
export function disponible(
  cantidadTotal: number | null,
  articuloId: string,
  salida: string | null,
  devolucion: string | null,
  reservas: Reserva[],
  excluirReservaId?: string,
): number {
  const total = cantidadTotal ?? 0;
  const ocupadas = reservas
    .filter(
      (r) =>
        r.articulo_id === articuloId &&
        r.id !== excluirReservaId &&
        OCUPAN.includes(r.estado) &&
        solapan(salida, devolucion, r.fecha_salida, r.fecha_devolucion),
    )
    .reduce((s, r) => s + Number(r.cantidad), 0);
  return total - ocupadas;
}
