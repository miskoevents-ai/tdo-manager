"use client";

import * as React from "react";
import { ClipboardCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { eur, fecha } from "@/lib/format";

type Cobro = { titulo: string; cliente: string | null; importe: number; fechaEvento: string | null };
type Fianza = { titulo: string; cliente: string | null; importe: number };
type Deuda = { persona: string; debe: number; deben: number };

// Repaso para Jero: junta los pendientes en un mensaje listo para WhatsApp,
// para que él confirme qué está pagado/devuelto y luego se marque en la app.
export function RepasoJero({
  cobros,
  fianzas,
  deudas,
}: {
  cobros: Cobro[];
  fianzas: Fianza[];
  deudas: Deuda[];
}) {
  const [copiado, setCopiado] = React.useState(false);

  const mensaje = React.useMemo(() => {
    const L: string[] = ["👋 Jero, repaso de pendientes. Dime el estado de cada uno cuando puedas:"];
    if (cobros.length) {
      L.push("", `💰 COBROS PENDIENTES (${cobros.length})`);
      for (const c of cobros) {
        const cli = c.cliente ? ` · ${c.cliente}` : "";
        const f = c.fechaEvento ? ` · ${fecha(c.fechaEvento)}` : "";
        L.push(`• ${c.titulo}${cli} — ${eur(c.importe)}${f}  ¿cobrado?`);
      }
    }
    if (fianzas.length) {
      L.push("", `🔐 FIANZAS POR DEVOLVER (${fianzas.length})`);
      for (const f of fianzas) {
        const cli = f.cliente ? ` · ${f.cliente}` : "";
        L.push(`• ${f.titulo}${cli} — ${eur(f.importe)}  ¿devuelta?`);
      }
    }
    if (deudas.length) {
      L.push("", "🤝 CUENTAS CON EL EQUIPO");
      for (const d of deudas) {
        const partes: string[] = [];
        if (d.deben > 0.01) partes.push(`le debe a TDO ${eur(d.deben)}`);
        if (d.debe > 0.01) partes.push(`TDO le debe ${eur(d.debe)}`);
        L.push(`• ${d.persona}: ${partes.join(" · ")}  ¿saldado?`);
      }
    }
    L.push("", "¡Gracias! 🙌");
    return L.join("\n");
  }, [cobros, fianzas, deudas]);

  const nada = cobros.length === 0 && fianzas.length === 0 && deudas.length === 0;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* algunos navegadores lo bloquean; el textarea permite copiar a mano */
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck size={15} /> Repaso para Jero
        </Button>
      </DialogTrigger>
      <DialogContent title="Repaso de pendientes para Jero">
        {nada ? (
          <p className="text-small text-ink-muted">No hay nada pendiente ahora mismo. 🎉</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-muted">
              Cópialo o mándalo por WhatsApp. Cuando Jero te conteste, marca cada cosa en su sitio
              (cobrar, devolver fianza, saldar) y desaparece del repaso.
            </p>
            <textarea
              readOnly
              value={mensaje}
              rows={Math.min(18, mensaje.split("\n").length + 1)}
              className="w-full rounded-md border-med border-border bg-beige-light p-3 font-mono text-[12px] leading-relaxed text-ink"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">Cerrar</Button>
              </DialogClose>
              <Button type="button" variant="outline" size="sm" onClick={copiar}>
                {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar"}
              </Button>
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-sm bg-sage px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-90"
              >
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
