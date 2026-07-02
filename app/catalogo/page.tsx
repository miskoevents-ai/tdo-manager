import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { CatalogoGrid } from "@/components/catalogo/CatalogoGrid";
import { CATALOGO } from "@/lib/catalogo";

export const dynamic = "force-dynamic";

export default function CatalogoPage() {
  return (
    <div className="space-y-5">
      <InfoNote id="catalogo">
        Galería de vuestras decoraciones para enseñar a clientes: filtra por categoría (flores,
        iluminación, corporativo, rincones de boda…) y pulsa una foto para verla grande con su
        descripción. Los precios se irán añadiendo.
      </InfoNote>
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">Catálogo · {CATALOGO.length} fotos</Overline>
      </div>
      <CatalogoGrid items={CATALOGO} />
    </div>
  );
}
