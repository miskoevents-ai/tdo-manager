import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { FacturasList } from "@/components/facturas/FacturasList";
import { PresupuestosList, type PresupuestoRow } from "@/components/facturas/PresupuestosList";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getFacturas, getOportunidades } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import type { Factura, Oportunidad } from "@/lib/types";

export const dynamic = "force-dynamic";

// Ordena "mayor primero" los números de presupuesto NNNN/AAAA; los formatos
// libres (PRE-…, S&J/2026…) van después, y sin número al final.
function pesoNumero(numero: string | null): number {
  const m = numero?.match(/^(\d+)\/(\d{4})$/);
  if (m) return Number(m[2]) * 100000 + Number(m[1]);
  return numero ? 1 : 0;
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { tab } = (await searchParams) ?? {};

  let facturas: Factura[], ops: Oportunidad[];
  try {
    [facturas, ops] = await Promise.all([getFacturas(), getOportunidades()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const year = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" })
    .format(new Date())
    .slice(0, 4);
  const yy = year.slice(2);

  // Serie de facturas AANNN (26015 → siguiente 26016).
  const maxFac = facturas.reduce((mx, f) => {
    const n = f.numero;
    return /^\d{5}$/.test(n) && n.startsWith(yy) ? Math.max(mx, Number(n.slice(2))) : mx;
  }, 0);
  const ultimaFactura = maxFac > 0 ? `${yy}${String(maxFac).padStart(3, "0")}` : null;
  const siguienteFactura = `${yy}${String(maxFac + 1).padStart(3, "0")}`;

  // Serie de presupuestos NNNN/AAAA (máx. 4 cifras: los números externos tipo
  // 26101/2026 no cuentan para el correlativo).
  const maxPre = ops.reduce((mx, o) => {
    const m = o.numero?.match(/^(\d{1,4})\/(\d{4})$/);
    return m && m[2] === year ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
  const ultimoPresupuesto =
    maxPre > 0
      ? ops
          .map((o) => o.numero)
          .find((n) => {
            const m = n?.match(/^(\d{1,4})\/(\d{4})$/);
            return m && m[2] === year && Number(m[1]) === maxPre;
          }) ?? null
      : null;
  const siguientePresupuesto = `${String(maxPre + 1).padStart(4, "0")}/${year}`;

  const presupuestos: PresupuestoRow[] = ops
    .filter((o) => (o.presupuesto_lineas ?? []).length > 0 || o.numero)
    .map((o) => {
      const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
      return {
        id: o.id,
        numero: o.numero,
        titulo: o.titulo,
        cliente: o.cliente?.nombre ?? null,
        fechaEntrada: o.fecha_entrada,
        fechaEvento: o.fecha_evento,
        total: t.total,
        estado: o.estado,
        esAmigos: o.tipo_operacion === "amigos_prestamo",
      };
    })
    .sort((a, b) => pesoNumero(b.numero) - pesoNumero(a.numero));

  const tabInicial = tab === "presupuestos" ? "presupuestos" : "facturas";

  return (
    <div className="space-y-5">
      <InfoNote id="facturas">
        El archivo de documentos del negocio: todas las facturas y presupuestos con su número, su
        estado y el documento listo para ver o imprimir — sin ir a buscarlos al OneDrive.
      </InfoNote>

      <div className="flex justify-end">
        <Link
          href="/facturas/nueva"
          className="inline-flex items-center gap-2 rounded-sm bg-sage px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-90"
        >
          <Plus size={15} /> Nueva factura
        </Link>
      </div>

      {/* Numeración de las dos series, de un vistazo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden p-4 pl-[18px]">
          <span className="absolute left-0 top-0 h-full w-[3px] bg-sage" />
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Facturas · {facturas.length}
          </div>
          <div className="mt-1 text-[13.5px]">
            Última: <b className="tabular">{ultimaFactura ?? "—"}</b>
            <span className="mx-2 text-ink-muted">·</span>
            Siguiente: <b className="tabular text-sage">{siguienteFactura}</b>
          </div>
        </Card>
        <Card className="relative overflow-hidden p-4 pl-[18px]">
          <span className="absolute left-0 top-0 h-full w-[3px] bg-clay" />
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Presupuestos · {presupuestos.length}
          </div>
          <div className="mt-1 text-[13.5px]">
            Último: <b className="tabular">{ultimoPresupuesto ?? "—"}</b>
            <span className="mx-2 text-ink-muted">·</span>
            Siguiente: <b className="tabular text-clay">{siguientePresupuesto}</b>
          </div>
        </Card>
      </div>

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas">
          {facturas.length === 0 ? (
            <p className="text-small text-ink-muted">
              Aún no hay facturas. Emite una desde la ficha de una oportunidad confirmada.
            </p>
          ) : (
            <FacturasList facturas={facturas} />
          )}
        </TabsContent>

        <TabsContent value="presupuestos">
          {presupuestos.length === 0 ? (
            <p className="text-small text-ink-muted">
              Aún no hay presupuestos. Crea una oportunidad y añade líneas en su pestaña
              Presupuesto.
            </p>
          ) : (
            <>
              <Overline className="!mt-0 mb-3">Todos los presupuestos emitidos</Overline>
              <PresupuestosList presupuestos={presupuestos} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
