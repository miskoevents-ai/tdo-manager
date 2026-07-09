"use client";

import * as React from "react";

// Portada de los documentos: prueba las fuentes en orden (p. ej. la foto del
// bucket con y sin extensión) y se queda con la primera que cargue. La última
// de la lista es el respaldo local, que siempre existe.
//
// Detalle importante: si la imagen falla ANTES de que React hidrate la
// página, el onError se pierde y el <img> se queda roto. Por eso, además del
// onError, al montar se comprueba el estado real (complete + naturalWidth).
export function PortadaDoc({ srcs, alt }: { srcs: string[]; alt: string }) {
  const [i, setI] = React.useState(0);
  const [ronda, setRonda] = React.useState(0);
  const ref = React.useRef<HTMLImageElement>(null);
  const ultima = srcs.length - 1;
  const enRespaldo = i >= ultima;

  const base = srcs[Math.min(i, ultima)];
  // En la ronda de reintento se salta la caché del navegador, que puede
  // haberse quedado con el error.
  const src =
    !enRespaldo && ronda > 0 ? `${base}${base.includes("?") ? "&" : "?"}r=${ronda}` : base;

  const fallar = React.useCallback(() => {
    setI((v) => (v < ultima ? v + 1 : v));
  }, [ultima]);

  // Errores perdidos antes de la hidratación: si el <img> ya terminó y no
  // tiene dimensiones, es que falló sin que nos enteráramos.
  React.useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) fallar();
  }, [src, fallar]);

  // Si todo falló (corte puntual de red), un único reintento a los 2 s.
  React.useEffect(() => {
    if (enRespaldo && ronda === 0 && ultima > 0) {
      const t = setTimeout(() => {
        setRonda(1);
        setI(0);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [enRespaldo, ronda, ultima]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} className="h-auto w-full" onError={fallar} />
  );
}
