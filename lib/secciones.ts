// Secciones a las que se puede dar/quitar acceso por usuario. La "clave" es la
// que se guarda en usuarios.permisos; los "prefijos" son las rutas que cubre
// (una sección puede incluir varias páginas, p. ej. Tesorería cubre también
// Comisiones, Gastos fijos y Proveedores).
export type Seccion = { key: string; label: string; prefijos: string[] };

export const SECCIONES: Seccion[] = [
  { key: "/oportunidades", label: "Oportunidades", prefijos: ["/oportunidades"] },
  { key: "/tareas", label: "Tareas", prefijos: ["/tareas"] },
  { key: "/calendario", label: "Calendario", prefijos: ["/calendario"] },
  { key: "/facturas", label: "Documentos", prefijos: ["/facturas"] },
  { key: "/tesoreria", label: "Tesorería", prefijos: ["/tesoreria", "/comisiones", "/gastos-fijos", "/proveedores"] },
  { key: "/contabilidad", label: "Contabilidad", prefijos: ["/contabilidad"] },
  { key: "/cuadro-mando", label: "Cuadro de mando", prefijos: ["/cuadro-mando"] },
  { key: "/inventario", label: "Inventario", prefijos: ["/inventario"] },
  { key: "/catalogo", label: "Catálogo", prefijos: ["/catalogo"] },
  { key: "/equipo", label: "Equipo", prefijos: ["/equipo"] },
  { key: "/clientes", label: "Clientes", prefijos: ["/clientes"] },
  { key: "/fidelizacion", label: "Fidelización", prefijos: ["/fidelizacion"] },
  { key: "/actividad", label: "Actividad", prefijos: ["/actividad"] },
];

// Inicio y Guía están siempre disponibles (no se pueden quitar).
const SIEMPRE = ["/", "/guia"];

function coincide(path: string, prefijo: string): boolean {
  if (prefijo === "/") return path === "/";
  return path === prefijo || path.startsWith(prefijo + "/");
}

// A qué sección pertenece una ruta (o null si no está clasificada).
export function seccionDeRuta(path: string): Seccion | null {
  return SECCIONES.find((s) => s.prefijos.some((p) => coincide(path, p))) ?? null;
}

// ¿Puede este usuario (no admin) entrar en esta ruta?
//  · permisos NULL/undefined → sí (comportamiento anterior).
//  · Inicio/Guía → siempre.
//  · Rutas no clasificadas → sí (evita bloqueos accidentales).
export function puedeAcceder(path: string, permisos: string[] | null | undefined): boolean {
  if (permisos == null) return true;
  if (SIEMPRE.some((p) => coincide(path, p))) return true;
  const sec = seccionDeRuta(path);
  if (!sec) return true;
  return permisos.includes(sec.key);
}
