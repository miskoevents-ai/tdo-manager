"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarOportunidad, crearClienteRapido } from "@/app/actions";
import type { Cliente, Lugar, Oportunidad } from "@/lib/types";
import { TIPO_EVENTO_LABEL, ESTADOS_TODOS, ESTADO_META, CANALES, PROBABILIDAD_POR_ESTADO } from "@/lib/estados";

// Suma días a una fecha ISO (YYYY-MM-DD).
function sumaDias(iso: string, dias: number): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function OportunidadDialog({
  clientes,
  lugares,
  oportunidad,
  responsables = [],
  equipo = [],
  triggerLabel,
  ocupadas = [],
}: {
  clientes: Cliente[];
  lugares: Lugar[];
  oportunidad?: Oportunidad;
  responsables?: string[];
  equipo?: { id: string; nombre: string }[]; // para asignar comisión a una persona
  triggerLabel?: string; // texto del botón al crear (por defecto "Nueva oportunidad")
  // Fechas ya ocupadas por otras oportunidades vivas (para avisar del solape).
  ocupadas?: { fecha: string; titulo: string; contratada: boolean }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(oportunidad);

  // Fechas encadenadas: al fijar la fecha del evento, se acercan las de material
  // (montaje y recogida/devolución). Al fijar la devolución del material, la
  // devolución de la fianza se propone a 2 días después. Todo editable.
  const [evento, setEvento] = React.useState(oportunidad?.fecha_evento ?? "");
  const [montaje, setMontaje] = React.useState(oportunidad?.fecha_montaje ?? "");
  const [recogida, setRecogida] = React.useState(oportunidad?.fecha_recogida ?? "");
  // Tipo de operación en UN único selector de 3 opciones (claro y sin default
  // silencioso alquiler/venta). Deja explícito que "evento" = producción de un
  // evento (bodas, corporativos, producciones):
  //   evento   → serie 'evento'
  //   alquiler → serie 'alquiler_encargo', se devuelve (con fianza)
  //   venta    → serie 'alquiler_encargo', es_encargo (se lo queda el cliente)
  const [modoOp, setModoOp] = React.useState<"evento" | "alquiler" | "venta">(
    oportunidad
      ? oportunidad.serie === "alquiler_encargo"
        ? oportunidad.es_encargo
          ? "venta"
          : "alquiler"
        : "evento"
      : "evento",
  );
  // La serie cambia las etiquetas de fechas: evento → montaje/recogida de la
  // decoración; alquiler/venta → salida/devolución del material.
  const serie = modoOp === "evento" ? "evento" : "alquiler_encargo";
  const esAlquiler = modoOp !== "evento";
  // Otras oportunidades vivas en la fecha elegida (aviso de solape).
  const solapes = evento ? ocupadas.filter((o) => o.fecha === evento) : [];
  const [fianzaFecha, setFianzaFecha] = React.useState(oportunidad?.fecha_devolucion_fianza ?? "");
  // La fecha de devolución solo tiene sentido si hay fianza (> 0).
  const [fianza, setFianza] = React.useState(String(oportunidad?.fianza ?? ""));
  const hayFianza = (parseFloat(fianza) || 0) > 0;
  // Envío por mensajería (material producido que se manda): se marca al crear.
  const [envio, setEnvio] = React.useState(oportunidad?.envio ?? false);
  const [envioCoste, setEnvioCoste] = React.useState(String(oportunidad?.envio_coste ?? ""));
  const [envioIncluido, setEnvioIncluido] = React.useState(oportunidad?.envio_incluido ?? true);
  function onRecogida(v: string) {
    setRecogida(v);
    if (v) setFianzaFecha(sumaDias(v, 2));
  }
  function onEvento(v: string) {
    setEvento(v);
    if (v) {
      if (!montaje) setMontaje(v);
      if (!recogida) onRecogida(v);
    }
  }

  // Lugar: desplegable de lugares anteriores o escribir uno nuevo.
  const [lugarNombre, setLugarNombre] = React.useState(oportunidad?.lugar?.nombre ?? "");
  const lugarEnLista = lugares.some((l) => l.nombre === lugarNombre);
  const [lugarNuevo, setLugarNuevo] = React.useState(Boolean(lugarNombre) && !lugarEnLista);

  // Opciones de responsable (equipo) incluyendo el valor actual si es libre.
  const responsablesOpts = React.useMemo(() => {
    const set = new Set(responsables);
    if (oportunidad?.responsable) set.add(oportunidad.responsable);
    return Array.from(set);
  }, [responsables, oportunidad?.responsable]);

  // Lista local de clientes (para poder añadir uno nuevo al vuelo).
  const [clientesList, setClientesList] = React.useState<Cliente[]>(clientes);
  React.useEffect(() => setClientesList(clientes), [clientes]);

  // Retención sugerida según el cliente seleccionado (empresa → 15%).
  const [clienteId, setClienteId] = React.useState(oportunidad?.cliente_id ?? "");
  const clienteSel = clientesList.find((c) => c.id === clienteId);
  const retSugerida = clienteSel?.tipo === "empresa" ? 15 : 0;

  // Alta rápida de cliente
  const [nuevoAbierto, setNuevoAbierto] = React.useState(false);
  const [nuevoNombre, setNuevoNombre] = React.useState("");
  const [nuevoTipo, setNuevoTipo] = React.useState("particular");
  const [creando, setCreando] = React.useState(false);

  async function crearCliente() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const c = await crearClienteRapido(nuevoNombre, nuevoTipo);
      const nuevo: Cliente = {
        id: c.id,
        nombre: c.nombre,
        tipo: nuevoTipo as Cliente["tipo"],
        email: null,
        telefono: null,
        nif_cif: null,
        direccion: null,
        localidad: null,
        origen: "cliente_nuevo",
        estado: "lead",
        canal: null,
        notas: null,
        created_at: new Date().toISOString(),
      };
      setClientesList((l) => [nuevo, ...l].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setClienteId(c.id);
      setNuevoAbierto(false);
      setNuevoNombre("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreando(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await guardarOportunidad(new FormData(e.currentTarget));
      setOpen(false);
      if (!editar && id) router.push(`/oportunidades/${id}`);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editar ? (
          <Button variant="outline" size="sm">
            <Pencil size={14} /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus size={15} /> {triggerLabel ?? "Nueva oportunidad"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar oportunidad" : "Nueva oportunidad"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {oportunidad && <input type="hidden" name="id" value={oportunidad.id} />}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Número">
              <Input
                name="numero"
                defaultValue={oportunidad?.numero}
                placeholder="Automático (0134/2026)"
              />
              {!oportunidad && (
                <p className="mt-1 text-[10.5px] text-ink-muted">
                  Déjalo vacío y se asigna el siguiente correlativo del año.
                </p>
              )}
            </Field>
            <Field label="Título *" className="col-span-2">
              <Input name="titulo" defaultValue={oportunidad?.titulo} required />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                Cliente
              </span>
              <button
                type="button"
                onClick={() => setNuevoAbierto((v) => !v)}
                className="text-[11px] font-semibold text-clay hover:text-clay-600"
              >
                {nuevoAbierto ? "Cancelar" : "+ Nuevo"}
              </button>
            </div>
            {nuevoAbierto ? (
              <div className="space-y-2 rounded-md border-hair border-clay-tint-deep bg-clay-tint/40 p-3">
                <Input
                  autoFocus
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del nuevo cliente"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      crearCliente();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
                    <option value="particular">Particular</option>
                    <option value="empresa">Empresa</option>
                    <option value="wedding_planner">Wedding planner</option>
                    <option value="finca_venue">Finca / venue</option>
                  </Select>
                  <Button type="button" size="sm" onClick={crearCliente} disabled={creando}>
                    {creando ? "Creando…" : "Crear (Lead)"}
                  </Button>
                </div>
              </div>
            ) : (
              <Select
                name="cliente_id"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">— Sin cliente —</option>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            )}
            {/* Asegura que el valor viaja en el submit aunque el mini-form esté abierto */}
            {nuevoAbierto && <input type="hidden" name="cliente_id" value={clienteId} />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo de operación: un único selector de 3 opciones. Las etiquetas,
                las condiciones del presupuesto y el modelo de coste dependen de él. */}
            <Field label="Tipo de operación">
              <Select value={modoOp} onChange={(e) => setModoOp(e.target.value as "evento" | "alquiler" | "venta")}>
                <option value="evento">Producción / evento (bodas, corporativos…)</option>
                <option value="alquiler">Alquiler (se devuelve, con fianza)</option>
                <option value="venta">Venta / encargo (se lo queda el cliente)</option>
              </Select>
              {/* Estos valores son los que lee el servidor (serie + es_encargo). */}
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="es_encargo" value={modoOp === "venta" ? "encargo" : "alquiler"} />
              <p className="mt-1 text-[11px] text-ink-muted">
                {modoOp === "evento"
                  ? "Decoración/producción de un evento propio (montaje y desmontaje)."
                  : modoOp === "alquiler"
                    ? "Préstamo de material: entrega, recogida y fianza."
                    : "Fabricación a medida que se queda el cliente (sin fianza ni devolución)."}
              </p>
            </Field>
            {/* El tipo de evento solo aplica a producciones/eventos. Para
                alquiler/venta se fija a 'alquiler_encargo' de forma oculta. */}
            {modoOp === "evento" ? (
              <Field label="Tipo de evento">
                <Select name="tipo_evento" defaultValue={oportunidad?.tipo_evento && oportunidad.tipo_evento !== "alquiler_encargo" ? oportunidad.tipo_evento : "boda"}>
                  {Object.entries(TIPO_EVENTO_LABEL)
                    .filter(([v]) => v !== "alquiler_encargo")
                    .map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="tipo_evento" value="alquiler_encargo" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <Select name="estado" defaultValue={oportunidad?.estado ?? "nueva"}>
                {ESTADOS_TODOS.map((s) => (
                  <option key={s} value={s}>{ESTADO_META[s].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Operación">
              <Select name="tipo_operacion" defaultValue={oportunidad?.tipo_operacion ?? "normal"}>
                <option value="normal">Normal (con factura)</option>
                <option value="amigos_prestamo">Amigos / préstamo</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Probabilidad de cierre (%): vacío = según estado. Migración 059. */}
            <Field label="Probabilidad de cierre %">
              <Input
                type="number"
                name="probabilidad"
                min={0}
                max={100}
                step={5}
                defaultValue={oportunidad?.probabilidad ?? ""}
                placeholder={`Auto: ${PROBABILIDAD_POR_ESTADO[oportunidad?.estado ?? "nueva"]}% (por estado)`}
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Déjala en blanco para que siga al estado sola.
              </p>
            </Field>
          </div>

          {/* Reparto de cobro para alquileres/encargos: qué % va con factura;
              el resto se cobra en efectivo ("amigos"). Solo se muestra aquí y
              en el email al cliente, nunca en el presupuesto. Migración 054. */}
          {esAlquiler && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="% con factura">
                <Input
                  type="number"
                  name="pct_factura"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={oportunidad?.pct_factura ?? 25}
                />
                <p className="mt-1 text-[11px] text-ink-muted">
                  El resto se cobra en efectivo (amigos).
                </p>
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de entrada">
              <Input
                type="date"
                name="fecha_entrada"
                defaultValue={oportunidad?.fecha_entrada ?? ""}
              />
            </Field>
            <Field label="Canal">
              <Select name="canal" defaultValue={oportunidad?.canal ?? ""}>
                <option value="">— Sin especificar —</option>
                {CANALES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                  Lugar
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLugarNuevo((v) => {
                      // Al alternar, limpiamos el valor para no arrastrar el otro modo.
                      setLugarNombre("");
                      return !v;
                    })
                  }
                  className="text-[11px] font-semibold text-clay hover:text-clay-600"
                >
                  {lugarNuevo ? "Elegir de la lista" : "+ Nuevo"}
                </button>
              </div>
              {lugarNuevo ? (
                <Input
                  autoFocus
                  value={lugarNombre}
                  onChange={(e) => setLugarNombre(e.target.value)}
                  placeholder="Hotel Urban, Finca…"
                  autoComplete="off"
                />
              ) : (
                <Select value={lugarNombre} onChange={(e) => setLugarNombre(e.target.value)}>
                  <option value="">— Sin lugar —</option>
                  {lugares.map((l) => (
                    <option key={l.id} value={l.nombre}>{l.nombre}</option>
                  ))}
                </Select>
              )}
              {/* El valor viaja siempre en el submit; la acción resuelve o crea el lugar. */}
              <input type="hidden" name="lugar_nombre" value={lugarNombre} />
            </div>
            <Field label="Fecha del evento">
              <Input type="date" name="fecha_evento" value={evento} onChange={(e) => onEvento(e.target.value)} />
              {/* Aviso de solape: ese día ya hay otra oportunidad viva. No
                  bloquea (la pauta es estudiarlo con refuerzo), solo avisa. */}
              {evento && solapes.length > 0 && (
                <p className={`mt-1 text-[11px] ${solapes.some((s) => s.contratada) ? "font-semibold text-[#7a5a1a]" : "text-ink-muted"}`}>
                  {solapes.some((s) => s.contratada) ? "⚠️ Ese día ya hay evento contratado: " : "ℹ️ Ese día ya hay en el pipeline: "}
                  {solapes.map((s) => s.titulo).join(" · ")}
                </p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={esAlquiler ? "Salida del material" : "Montaje"}>
              <Input type="date" name="fecha_montaje" value={montaje} onChange={(e) => setMontaje(e.target.value)} />
            </Field>
            <Field label={esAlquiler ? "Devolución del material" : "Recogida"}>
              <Input type="date" name="fecha_recogida" value={recogida} onChange={(e) => onRecogida(e.target.value)} />
            </Field>
          </div>

          {!esAlquiler && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horario de montaje">
                <Input name="hora_montaje" defaultValue={oportunidad?.hora_montaje ?? ""} placeholder="p. ej. 7:00–15:00" />
              </Field>
              <Field label="Horario de desmontaje">
                <Input name="hora_desmontaje" defaultValue={oportunidad?.hora_desmontaje ?? ""} placeholder="p. ej. 00:00" />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <Field label="Invitados">
              <Input type="number" name="n_invitados" defaultValue={oportunidad?.n_invitados ?? ""} />
            </Field>
            <Field label="IVA %">
              <Input type="number" step="1" min="0" name="iva_pct" defaultValue={oportunidad?.iva_pct ?? 21} />
            </Field>
            <Field label="Retención %">
              <Input
                type="number"
                step="1"
                min="0"
                name="retencion_pct"
                key={retSugerida + (oportunidad?.id ?? "")}
                defaultValue={oportunidad?.retencion_pct ?? retSugerida}
              />
            </Field>
            <Field label="Fianza €">
              <Input
                type="number"
                step="0.01"
                name="fianza"
                value={fianza}
                onChange={(e) => setFianza(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {hayFianza && (
              <Field label="Fecha devolución de la fianza">
                <Input
                  type="date"
                  name="fecha_devolucion_fianza"
                  value={fianzaFecha}
                  onChange={(e) => setFianzaFecha(e.target.value)}
                />
                {recogida && (
                  <p className="mt-1 text-[10.5px] text-ink-muted">
                    Sugerido: 2 días tras la devolución del material ({sumaDias(recogida, 2).split("-").reverse().join("/")}). Puedes cambiarlo.
                  </p>
                )}
                {!recogida && (
                  <p className="mt-1 text-[10.5px] text-ink-muted">
                    Al fijar la devolución del material, se propone 2 días después. Puedes cambiarlo.
                  </p>
                )}
              </Field>
            )}
            <Field label="Condiciones de pago">
              <Select name="pago_a_dias" defaultValue={String(oportunidad?.pago_a_dias ?? 0)}>
                <option value="0">Al momento</option>
                <option value="15">A 15 días</option>
                <option value="30">A 30 días</option>
                <option value="45">A 45 días</option>
                <option value="60">A 60 días</option>
                <option value="90">A 90 días</option>
              </Select>
              <p className="mt-1 text-[10.5px] text-ink-muted">
                La alarma de cobro no salta hasta que venza el plazo.
              </p>
            </Field>
          </div>

          {/* Envío: para material producido que se manda por mensajería. */}
          <div className="rounded-md border-hair border-border bg-beige-light/50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink-secondary">
              <input
                type="checkbox"
                name="envio"
                checked={envio}
                onChange={(e) => setEnvio(e.target.checked)}
                className="h-4 w-4 accent-sage"
              />
              📦 Este pedido se envía (mensajería)
            </label>
            {envio && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Coste del envío €">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    name="envio_coste"
                    value={envioCoste}
                    onChange={(e) => setEnvioCoste(e.target.value)}
                    placeholder="p. ej. 15"
                  />
                </Field>
                <Field label="¿Cómo se cobra?">
                  <Select
                    name="envio_incluido"
                    value={envioIncluido ? "si" : "no"}
                    onChange={(e) => setEnvioIncluido(e.target.value === "si")}
                  >
                    <option value="si">Incluido en el precio</option>
                    <option value="no">Se cobra aparte al cliente</option>
                  </Select>
                  <p className="mt-1 text-[10.5px] text-ink-muted">
                    {envioIncluido
                      ? "El cliente no ve el envío: cúbrelo dentro del precio."
                      : "Sale como línea propia en el presupuesto (lo paga el cliente)."}
                  </p>
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable">
              <Select name="responsable" defaultValue={oportunidad?.responsable ?? ""}>
                <option value="">— Sin asignar —</option>
                {responsablesOpts.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>
            <Field label="Comisión para">
              <Select name="comision_equipo_id" defaultValue={oportunidad?.comision_equipo_id ?? ""}>
                <option value="">— Ninguna —</option>
                {equipo.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </Select>
              <p className="mt-1 text-[10.5px] text-ink-muted">
                Solo esta persona cobra comisión de esta venta, con su % por tipo de evento. Vacío = sin comisión.
              </p>
            </Field>
          </div>
          <Field label="Logística del lugar (accesos, muelle de carga, horarios del recinto…)">
            <Textarea name="logistica" defaultValue={oportunidad?.logistica ?? ""} placeholder="Muelle de carga, horario de acceso, restricciones del recinto, contacto de sala…" />
          </Field>

          <Field label="Notas">
            <Textarea name="notas" defaultValue={oportunidad?.notas ?? ""} />
          </Field>

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
