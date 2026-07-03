"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Video, MapPin, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { crearReunion, toggleReunionRealizada, borrarReunion } from "@/app/actions";
import { fecha as fmtFecha } from "@/lib/format";
import type { Reunion } from "@/lib/types";

export function ReunionesTab({
  oportunidadId,
  reuniones,
  responsables,
}: {
  oportunidadId: string;
  reuniones: Reunion[];
  responsables: string[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [fecha, setFecha] = React.useState("");
  const [hora, setHora] = React.useState("");
  const [modalidad, setModalidad] = React.useState<"presencial" | "online">("presencial");
  const [atiende, setAtiende] = React.useState("");
  const [enlace, setEnlace] = React.useState("");
  const [lugar, setLugar] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function guardar() {
    if (!fecha) return;
    setBusy("new");
    setError(null);
    try {
      await crearReunion({
        oportunidadId,
        fecha,
        hora: hora || null,
        modalidad,
        atendidaPor: atiende || null,
        enlace: modalidad === "online" ? enlace || null : null,
        lugar: modalidad === "presencial" ? lugar || null : null,
        notas: notas || null,
      });
      setAbierto(false);
      setFecha(""); setHora(""); setEnlace(""); setLugar(""); setNotas("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-muted">
          {reuniones.length === 0
            ? "Sin reuniones programadas"
            : `${reuniones.length} reunión${reuniones.length === 1 ? "" : "es"}`}
        </span>
        <Button size="sm" variant="outline" onClick={() => setAbierto((v) => !v)}>
          <Plus size={14} /> {abierto ? "Cerrar" : "Nueva reunión"}
        </Button>
      </div>

      {abierto && (
        <div className="space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Fecha">
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} autoFocus />
            </Field>
            <Field label="Hora">
              {/* step 300 = el selector va de 5 en 5 minutos */}
              <Input
                type="time"
                step={300}
                value={hora}
                onChange={(e) => {
                  // Redondea al múltiplo de 5 más cercano por si se teclea a mano.
                  const v = e.target.value;
                  if (/^\d{2}:\d{2}$/.test(v)) {
                    const [h, m] = v.split(":").map(Number);
                    const total = Math.round((h * 60 + m) / 5) * 5;
                    const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
                    const mm = String(total % 60).padStart(2, "0");
                    setHora(`${hh}:${mm}`);
                  } else {
                    setHora(v);
                  }
                }}
              />
            </Field>
            <Field label="Modalidad">
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as "presencial" | "online")}
                className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[14px] focus:border-sage-300 focus:outline-none"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </Field>
            <Field label="La atiende">
              <select
                value={atiende}
                onChange={(e) => setAtiende(e.target.value)}
                className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[14px] focus:border-sage-300 focus:outline-none"
              >
                <option value="">—</option>
                {responsables.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          {modalidad === "online" ? (
            <Field label="Enlace de la videollamada (Teams, Meet, Zoom…)">
              <Input
                type="url"
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://teams.microsoft.com/…"
              />
            </Field>
          ) : (
            <Field label="Dónde">
              <Input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Estudio, finca, cafetería…"
              />
            </Field>
          )}

          <Field label="Notas">
            <Input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Qué se va a tratar, qué llevar…"
            />
          </Field>

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={guardar} disabled={busy === "new" || !fecha}>
              {busy === "new" ? "Guardando…" : "Guardar reunión"}
            </Button>
          </div>
        </div>
      )}

      {reuniones.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">
          Programa aquí las reuniones con los novios: aparecerán también en el calendario.
        </p>
      ) : (
        <div className="space-y-2">
          {reuniones.map((r) => (
            <div
              key={r.id}
              className={`flex flex-wrap items-center gap-3 rounded-md border-hair border-border bg-white p-3 ${
                r.realizada ? "opacity-60" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                  {r.modalidad === "online" ? (
                    <Video size={14} className="shrink-0 text-[#7D6BA6]" />
                  ) : (
                    <MapPin size={14} className="shrink-0 text-clay" />
                  )}
                  <span>
                    {fmtFecha(r.fecha)}
                    {r.hora ? ` · ${r.hora.slice(0, 5)}h` : ""}
                  </span>
                  <span className="rounded-pill bg-beige-warm px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-secondary">
                    {r.modalidad === "online" ? "Online" : "Presencial"}
                  </span>
                  {r.realizada && (
                    <span className="rounded-pill bg-ok-tint px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ok">
                      Hecha
                    </span>
                  )}
                </div>
                <small className="text-[11.5px] text-ink-muted">
                  {r.atendida_por ? `La atiende ${r.atendida_por}` : "Sin responsable asignado"}
                  {r.modalidad === "presencial" && r.lugar ? ` · ${r.lugar}` : ""}
                  {r.notas ? ` · ${r.notas}` : ""}
                </small>
              </div>

              <div className="flex items-center gap-1.5">
                {r.modalidad === "online" && r.enlace && (
                  <a
                    href={r.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-[#7D6BA6] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90"
                  >
                    <ExternalLink size={12} /> Unirse
                  </a>
                )}
                <button
                  title={r.realizada ? "Marcar como pendiente" : "Marcar como hecha"}
                  disabled={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    try {
                      await toggleReunionRealizada(r.id, !r.realizada, oportunidadId);
                      router.refresh();
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className={`rounded-sm p-1.5 ${
                    r.realizada
                      ? "bg-ok-tint text-ok"
                      : "text-ink-muted hover:bg-ok-tint hover:text-ok"
                  }`}
                >
                  <Check size={14} />
                </button>
                <button
                  title="Borrar reunión"
                  disabled={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    try {
                      await borrarReunion(r.id, oportunidadId);
                      router.refresh();
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
