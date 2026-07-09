"use client";

import * as React from "react";

// Portada de los documentos: intenta la foto principal (p. ej. subida al
// bucket de Supabase) y, si no carga, cae a la imagen local de respaldo.
export function PortadaDoc({
  src,
  fallback,
  alt,
}: {
  src: string;
  fallback: string;
  alt: string;
}) {
  const [actual, setActual] = React.useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={actual}
      alt={alt}
      className="h-[190px] w-full object-cover"
      onError={() => {
        if (actual !== fallback) setActual(fallback);
      }}
    />
  );
}
