"use client";

import * as React from "react";

// Portada de los documentos: prueba las fuentes en orden (p. ej. la foto del
// bucket con y sin extensión) y se queda con la primera que cargue. La última
// de la lista es el respaldo local, que siempre existe. Si todo falló (p. ej.
// un corte puntual de red), reintenta la primera ronda una vez a los 2 s.
export function PortadaDoc({ srcs, alt }: { srcs: string[]; alt: string }) {
  const [i, setI] = React.useState(0);
  const [ronda, setRonda] = React.useState(0);
  const ultima = srcs.length - 1;
  const enRespaldo = i >= ultima;

  React.useEffect(() => {
    if (enRespaldo && ronda === 0 && ultima > 0) {
      const t = setTimeout(() => {
        setRonda(1);
        setI(0);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [enRespaldo, ronda, ultima]);

  const base = srcs[Math.min(i, ultima)];
  // En la segunda ronda se salta la caché del navegador (que puede haberse
  // quedado con el error).
  const src = !enRespaldo && ronda > 0 ? `${base}${base.includes("?") ? "&" : "?"}r=1` : base;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-auto w-full"
      onError={() => {
        if (i < ultima) setI(i + 1);
      }}
    />
  );
}
