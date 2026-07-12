// §5.4 · Regla ÚNICA de qué computa en la contabilidad mensual, derivada de la
// naturaleza del movimiento. Nadie la decide a mano: todos los formularios y
// acciones la derivan de aquí para que el resultado mensual sea consistente.
//
//   COMPUTAN  → ingreso_factura (facturas propias), gasto_fijo (estructura),
//               gasto_de_evento (costes oficiales de eventos), personal.
//   NO        → amigos (circuito aparte), comision (§5.4), inversion (capital,
//               no gasto del mes), otro (ajustes internos: reembolsos, traspasos).
export const NATURALEZAS_QUE_COMPUTAN = [
  "ingreso_factura",
  "gasto_fijo",
  "gasto_de_evento",
  "personal",
];

export function computaSegunNaturaleza(naturaleza: string | null | undefined): boolean {
  return NATURALEZAS_QUE_COMPUTAN.includes(naturaleza ?? "");
}
