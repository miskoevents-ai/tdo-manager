"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

// Pestañas de la ficha sincronizadas con la URL (?tab=…). Así:
//  · los enlaces internos que apuntan a otra pestaña (p. ej. "→ Calculadora"
//    desde Costes) cambian de verdad la pestaña visible, y
//  · al cambiar de pestaña, la URL se actualiza (refrescar o compartir el
//    enlace mantiene la pestaña) — sin recargar del servidor en cada clic.
export function FichaTabs({
  tabs,
  initial,
  children,
}: {
  tabs: string[];
  initial: string;
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const [value, setValue] = React.useState(initial);

  // Si la URL cambia por una navegación real (un enlace a ?tab=…), sincroniza
  // la pestaña visible. No se dispara con nuestro propio replaceState de abajo.
  const fromUrl = sp.get("tab");
  React.useEffect(() => {
    if (fromUrl && tabs.includes(fromUrl) && fromUrl !== value) setValue(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        setValue(v);
        // Actualiza la URL sin recargar (cambio superficial): el clic de pestaña
        // es instantáneo y la dirección queda con la pestaña activa.
        const params = new URLSearchParams(sp.toString());
        params.set("tab", v);
        window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
      }}
    >
      {children}
    </Tabs>
  );
}
