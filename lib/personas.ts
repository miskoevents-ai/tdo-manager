// Canoniza un nombre de persona contra los nombres del equipo, para que
// distintas grafías del mismo nombre ("Jero" y "Jero (Jerónimo Alonso
// Marcos)") cuenten SIEMPRE como la misma persona. Misma regla que
// canonizarPersonaEquipo en app/actions.ts (lado servidor):
//   1) coincidencia exacta (sin mayúsculas/acentos) → ese nombre;
//   2) si no, coincidencia por PRIMERA PALABRA y con un único candidato
//      ("Cris" y "Cristina" son palabras distintas: nunca se mezclan);
//   3) si no hay candidato único, se deja tal cual.
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const primeraPalabra = (s: string) => norm(s).split(/[\s(]+/)[0];

export function canonizarNombre(
  nombre: string | null | undefined,
  nombresEquipo: string[],
): string | null {
  const bruto = nombre?.trim();
  if (!bruto) return null;
  const b = norm(bruto);
  const exacto = nombresEquipo.filter((n) => norm(n) === b);
  if (exacto.length === 1) return exacto[0];
  const misma = nombresEquipo.filter((n) => primeraPalabra(n) === primeraPalabra(bruto));
  if (misma.length === 1) return misma[0];
  return bruto;
}
