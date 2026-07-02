import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { CatalogoGrid } from "@/components/catalogo/CatalogoGrid";
import { CATALOGO } from "@/lib/catalogo";

export const dynamic = "force-dynamic";

export default function CatalogoPage() {
  return (
    <div className="space-y-5">
      <InfoNote id="catalogo">
        Vuestro catálogo para enseñar a clientes: fotos reales y packs del dossier con su precio
        (tarifario 2026). Filtra por categoría y pulsa una tarjeta para ver la ficha completa.
      </InfoNote>
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">Catálogo · {CATALOGO.length} referencias</Overline>
      </div>
      <CatalogoGrid items={CATALOGO} />
    </div>
  );
}
