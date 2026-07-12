import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";
import { getFacturas, getOportunidades } from "@/lib/data";
import { eur } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://tdo-manager.vercel.app";

// Nombre de archivo seguro (sin acentos raros ni caracteres prohibidos).
function limpio(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

// Descarga todos los documentos guardados (facturas subidas + tickets) en un
// ZIP, más un índice HTML con enlace a cada factura y presupuesto (incluidas
// las generadas, que son páginas para imprimir y no archivos).
export async function GET() {
  if (!supabaseConfigurado()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  }
  const sb = createAdminClient();
  const zip = new JSZip();

  const [facturas, ops] = await Promise.all([getFacturas(), getOportunidades()]);
  const facById = new Map(facturas.map((f) => [f.id, f]));

  // 1) Facturas subidas como archivo (bucket tickets, carpeta facturas/).
  try {
    const { data: facFiles } = await sb.storage.from("tickets").list("facturas", { limit: 2000 });
    for (const obj of facFiles ?? []) {
      if (!obj.name || obj.name.startsWith(".")) continue;
      const { data: blob } = await sb.storage.from("tickets").download(`facturas/${obj.name}`);
      if (!blob) continue;
      const id = obj.name.replace(/\.pdf$/i, "");
      const f = facById.get(id);
      const nombre = f
        ? `Facturas/${f.numero}_${limpio(f.cliente?.nombre ?? "cliente")}.pdf`
        : `Facturas/${obj.name}`;
      zip.file(nombre, await blob.arrayBuffer());
    }
  } catch {
    /* si el bucket no existe aún, seguimos con el índice */
  }

  // 2) Tickets / justificantes (archivos en la raíz del bucket tickets).
  try {
    const { data: rootFiles } = await sb.storage.from("tickets").list("", { limit: 2000 });
    for (const obj of rootFiles ?? []) {
      if (!obj.name || obj.name === "facturas" || obj.name.startsWith(".") || !obj.name.includes(".")) continue;
      const { data: blob } = await sb.storage.from("tickets").download(obj.name);
      if (!blob) continue;
      zip.file(`Tickets/${limpio(obj.name)}`, await blob.arrayBuffer());
    }
  } catch {
    /* sin tickets */
  }

  // 3) Índice HTML: enlace a cada factura y presupuesto (para las generadas).
  const filasFac = facturas
    .map((f) => {
      const url = f.pdf_url || `${BASE}/facturas/${f.id}`;
      return `<tr><td>${f.numero}</td><td>${f.cliente?.nombre ?? "—"}</td><td>${f.fecha_emision}</td><td style="text-align:right">${eur(Number(f.total))}</td><td><a href="${url}" target="_blank">abrir${f.pdf_url ? " (PDF)" : ""}</a></td></tr>`;
    })
    .join("");
  const presu = ops.filter((o) => (o.presupuesto_lineas ?? []).length > 0 || o.numero);
  const filasPre = presu
    .map((o) => {
      const doc = o.tipo_operacion === "amigos_prestamo" ? "prestamo" : "presupuesto";
      const url = `${BASE}/oportunidades/${o.id}/${doc}`;
      return `<tr><td>${o.numero ?? "—"}</td><td>${o.titulo}</td><td>${o.cliente?.nombre ?? "—"}</td><td><a href="${url}" target="_blank">abrir</a></td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Documentos TDO</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#2b2a24}
h1{font-size:1.4rem}h2{margin-top:2rem;font-size:1.1rem;color:#3F4A36}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid #eae3d4;padding:6px 8px;text-align:left}
a{color:#BE6E4C}small{color:#726c5b}</style></head><body>
<h1>Documentos · Tu Decoración Original</h1>
<small>Copia generada desde TDO Manager. Las facturas subidas y los tickets están en las carpetas del ZIP; los presupuestos y facturas generadas se abren con estos enlaces (necesitas conexión) y se guardan con «Imprimir → Guardar como PDF».</small>
<h2>Facturas (${facturas.length})</h2>
<table><thead><tr><th>Nº</th><th>Cliente</th><th>Fecha</th><th style="text-align:right">Total</th><th>Documento</th></tr></thead><tbody>${filasFac}</tbody></table>
<h2>Presupuestos (${presu.length})</h2>
<table><thead><tr><th>Nº</th><th>Título</th><th>Cliente</th><th>Documento</th></tr></thead><tbody>${filasPre}</tbody></table>
</body></html>`;
  zip.file("indice.html", html);

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const fecha = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="TDO-documentos-${fecha}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
