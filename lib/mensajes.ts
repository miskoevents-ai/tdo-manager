import { EMPRESA } from "@/lib/empresa";
import { eur } from "@/lib/format";

export type TipoMensaje = "cobro" | "fianza" | "presupuesto";

// Normaliza un teléfono español a formato internacional para wa.me (34XXXXXXXXX).
export function telefonoWa(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && /^[679]/.test(d)) d = "34" + d; // móvil/fijo español sin prefijo
  return d;
}

// Genera el texto del mensaje según el tipo y el contexto.
export function textoMensaje(
  tipo: TipoMensaje,
  ctx: { nombre?: string | null; titulo?: string | null; importe?: number | null },
): string {
  const emp = EMPRESA.nombre;
  const hola = ctx.nombre ? `Hola ${ctx.nombre.split(" ")[0]}` : "Hola";
  const evento = ctx.titulo ? `«${ctx.titulo}»` : "tu evento";
  const imp = ctx.importe != null ? eur(ctx.importe) : "";
  switch (tipo) {
    case "cobro":
      return `${hola}, te escribo de ${emp}. Te recuerdo que queda pendiente el pago de ${imp} de ${evento}. ¿Nos confirmas cuándo podrás hacer la transferencia? ¡Muchas gracias! 🌿`;
    case "fianza":
      return `${hola}, soy de ${emp}. Todo correcto con la devolución del material de ${evento}, así que procedemos a devolverte la fianza de ${imp}. ¿Nos confirmas el número de cuenta, por favor? ¡Gracias por confiar en nosotros!`;
    case "presupuesto":
      return `${hola}, te escribo de ${emp} sobre el presupuesto de ${evento}. ¿Has podido verlo? Quedamos a tu disposición para cualquier ajuste o duda. Un saludo 🌿`;
  }
}

export function asuntoMensaje(tipo: TipoMensaje, titulo?: string | null): string {
  const t = titulo ? ` · ${titulo}` : "";
  if (tipo === "cobro") return `Pago pendiente${t}`;
  if (tipo === "fianza") return `Devolución de fianza${t}`;
  return `Tu presupuesto${t}`;
}

// Construye los enlaces de WhatsApp y email para un mensaje.
export function enlacesMensaje(
  tipo: TipoMensaje,
  ctx: { nombre?: string | null; titulo?: string | null; importe?: number | null; telefono?: string | null; email?: string | null },
): { texto: string; wa: string | null; mailto: string | null } {
  const texto = textoMensaje(tipo, ctx);
  const tel = telefonoWa(ctx.telefono);
  const wa = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : null;
  const mailto = ctx.email
    ? `mailto:${ctx.email}?subject=${encodeURIComponent(asuntoMensaje(tipo, ctx.titulo))}&body=${encodeURIComponent(texto)}`
    : null;
  return { texto, wa, mailto };
}
