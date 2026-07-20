"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subirFotosReferencia, borrarFotoReferencia, guardarNotaFoto } from "@/app/actions";
import type { OportunidadFoto } from "@/lib/types";

// Moodboard de la oportunidad: fotos de referencia/inspiración que sube
// Cristina. Subida múltiple, nota por foto, borrar, y ampliar al pulsar.
export function FotosReferencia({
  oportunidadId,
  fotos,
}: {
  oportunidadId: string;
  fotos: OportunidadFoto[];
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ampliada, setAmpliada] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("oportunidadId", oportunidadId);
      Array.from(files).forEach((f) => fd.append("fotos", f));
      await subirFotosReferencia(fd);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-muted">
          Fotos de inspiración o referencia del evento (moodboard). Sube varias a la vez.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button size="sm" variant="outline" disabled={subiendo} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={15} /> {subiendo ? "Subiendo…" : "Subir fotos"}
        </Button>
      </div>
      {error && <p className="text-caption text-error">{error}</p>}

      {fotos.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-med border-dashed border-border py-10 text-center text-ink-muted hover:border-sage-300 hover:bg-sage-tint/20"
        >
          <ImagePlus size={22} />
          <span className="text-[12.5px]">Aún no hay fotos. Pulsa para subir referencias.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f) => (
            <FotoCard
              key={f.id}
              foto={f}
              oportunidadId={oportunidadId}
              onAmpliar={() => setAmpliada(f.url)}
              onDone={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {ampliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setAmpliada(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setAmpliada(null)}>
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada} alt="Referencia" className="max-h-[90vh] max-w-[90vw] rounded-md object-contain" />
        </div>
      )}
    </div>
  );
}

function FotoCard({
  foto,
  oportunidadId,
  onAmpliar,
  onDone,
}: {
  foto: OportunidadFoto;
  oportunidadId: string;
  onAmpliar: () => void;
  onDone: () => void;
}) {
  const [nota, setNota] = React.useState(foto.nota ?? "");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="group overflow-hidden rounded-md border-hair border-border bg-white shadow-sm">
      <div className="relative aspect-square cursor-zoom-in bg-beige-warm" onClick={onAmpliar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={foto.nota ?? "Referencia"} className="h-full w-full object-cover" loading="lazy" />
        <button
          title="Eliminar foto"
          disabled={busy}
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm("¿Eliminar esta foto de referencia?")) return;
            setBusy(true);
            try {
              await borrarFotoReferencia(foto.id, oportunidadId);
              onDone();
            } finally {
              setBusy(false);
            }
          }}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1.5 text-white opacity-0 transition-opacity hover:bg-error group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (foto.nota ?? "") && guardarNotaFoto(foto.id, oportunidadId, nota)}
        placeholder="Nota…"
        className="w-full border-t border-border px-2 py-1.5 text-[11.5px] text-ink-secondary focus:outline-none"
      />
    </div>
  );
}
