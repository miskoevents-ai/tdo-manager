"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, MessageSquare, Shield, Sparkles, CalendarClock, ExternalLink, Pencil } from "lucide-react";
import { Card, CardTitle, Overline } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { guardarCalendlyUrl } from "@/app/actions";

type Plantilla = { titulo: string; cuando: string; texto: string };
type Objecion = { objecion: string; respuesta: string };

// Plantillas de mensajes para la venta. Los [corchetes] son huecos a rellenar.
const PLANTILLAS: { grupo: string; items: Plantilla[] }[] = [
  {
    grupo: "Presentación de la empresa",
    items: [
      {
        titulo: "Quiénes somos",
        cuando: "Cuando un cliente pregunta por vosotros o para abrir la propuesta.",
        texto:
          "En Tu Decoración Original diseñamos y decoramos bodas y eventos personalizados, cuidando cada detalle para que " +
          "todos los espacios guarden armonía. Desde 2012 transformamos fincas y espacios con decoración, diseño floral y " +
          "artesanía. Nos ocupamos del proyecto, la preparación, el montaje y el desmontaje, para que vosotros solo tengáis " +
          "que disfrutar. 🌿",
      },
      {
        titulo: "Nuestros servicios",
        cuando: "Para enumerar todo lo que ofrecéis.",
        texto:
          "Esto es lo que hacemos por vosotros:\n" +
          "• Ceremonias civiles y religiosas\n" +
          "• Bienvenida y seating plan\n" +
          "• Decoración floral y de mesas\n" +
          "• Photocalls y rincones especiales\n" +
          "• Cartelería personalizada\n" +
          "• Alquiler de mobiliario\n\n" +
          "Creamos una propuesta a medida, adaptada a vuestro estilo, vuestra finca y vuestra forma de celebrar.",
      },
    ],
  },
  {
    grupo: "Primer contacto",
    items: [
      {
        titulo: "Responder a un lead nuevo",
        cuando: "En cuanto entra la consulta (cuanto antes, mejor convierte).",
        texto:
          "¡Hola [nombre]! 😊 Muchas gracias por contar con Tu Decoración Original para vuestro [evento]. " +
          "Nos encantaría ayudaros a que sea especial. Para prepararos una propuesta a medida, ¿me confirmáis " +
          "fecha, lugar y nº de invitados aproximado? Y si tenéis alguna idea o inspiración, ¡encantados de verla!",
      },
      {
        titulo: "Pedir una llamada / videollamada",
        cuando: "Cuando el proyecto es grande y conviene hablar.",
        texto:
          "¡Hola [nombre]! Para afinar bien vuestra propuesta y que quede perfecta, ¿os viene bien una llamada rápida " +
          "esta semana? Con 15 minutos me hago una idea clara de lo que buscáis. ¿Qué día y hora os encaja mejor?",
      },
      {
        titulo: "Proponer visita / conocernos en persona",
        cuando: "Lead potente o boda grande: verse en persona (o visitar la finca) dispara el cierre.",
        texto:
          "¡Hola [nombre]! Vuestro [evento] tiene una pinta preciosa 😍 Para daros la mejor propuesta y que nos conozcáis, " +
          "nos encantaría veros en persona —podemos quedar nosotros o acercarnos a [finca/lugar] y así visualizamos juntos " +
          "la decoración sobre el terreno. ¿Os viene bien esta semana o la próxima? Nos adaptamos a vuestra agenda.",
      },
    ],
  },
  {
    grupo: "Seguimiento de presupuesto",
    items: [
      {
        titulo: "Seguimiento suave (a los 3-4 días)",
        cuando: "Presupuesto enviado, sin respuesta todavía.",
        texto:
          "¡Hola [nombre]! ¿Habéis podido echar un vistazo al presupuesto que os envié para vuestro [evento]? " +
          "Cualquier duda o ajuste que queráis, me decís sin problema y lo vemos juntos. ¡Estoy a vuestra disposición! 😊",
      },
      {
        titulo: "Seguimiento con urgencia de fecha",
        cuando: "La fecha se acerca o hay más peticiones para ese día.",
        texto:
          "¡Hola [nombre]! Os escribo para comentaros que tenemos varias peticiones para el [fecha] y me encantaría " +
          "poder reservaros el día. Si el presupuesto os encaja, con la señal os bloqueo la fecha. ¿Lo dejamos atado?",
      },
    ],
  },
  {
    grupo: "Cobros",
    items: [
      {
        titulo: "Recordatorio de señal / reserva",
        cuando: "Aceptaron el presupuesto pero falta la señal para bloquear fecha.",
        texto:
          "¡Hola [nombre]! Para dejaros reservado el [fecha] solo falta la señal de [importe]. En cuanto la tengamos, " +
          "os confirmo la reserva y empezamos a preparar todo. Os paso los datos por aquí. ¡Gracias! 😊",
      },
      {
        titulo: "Recordatorio de pago pendiente",
        cuando: "Cobro vencido o próximo al evento.",
        texto:
          "¡Hola [nombre]! Un recordatorio amable: queda pendiente el pago de [importe] de vuestro [evento] del [fecha]. " +
          "Cuando podáis, me confirmáis y seguimos con todo listo para el gran día. ¡Muchas gracias!",
      },
    ],
  },
  {
    grupo: "Después del evento",
    items: [
      {
        titulo: "Agradecer y pedir reseña",
        cuando: "1-2 días después del evento.",
        texto:
          "¡Hola [nombre]! Fue un placer formar parte de vuestro [evento] 🥰 Esperamos que lo disfrutarais tanto como " +
          "nosotros. Si os apetece, nos ayudaríais muchísimo con una reseña de Google contando vuestra experiencia. " +
          "¡Mil gracias por confiar en nosotros!",
      },
      {
        titulo: "Reactivar un cliente antiguo",
        cuando: "Cliente que ya contrató, para repetir.",
        texto:
          "¡Hola [nombre]! ¿Cómo estáis? Nos acordamos de vuestro [evento] con mucho cariño 😊 Si tenéis algo a la vista " +
          "(otro evento, una celebración…), estaríamos encantados de repetir. Cualquier cosa, aquí estamos.",
      },
    ],
  },
  {
    grupo: "Reactivar leads fríos",
    items: [
      {
        titulo: "Retomar un lead dormido",
        cuando: "Se enfrió y no ha respondido en semanas.",
        texto:
          "¡Hola [nombre]! Vuelvo a escribiros por si seguís dándole vueltas a la decoración de vuestro [evento]. " +
          "Si es buen momento, lo retomamos encantados; y si al final habéis decidido otra cosa, sin problema, " +
          "nos decís y os dejo tranquilos. ¡Un saludo! 😊",
      },
    ],
  },
];

// Objeciones típicas y una forma de rebatirlas (con tacto, sin presionar).
const OBJECIONES: Objecion[] = [
  {
    objecion: "«Es más caro de lo que pensábamos»",
    respuesta:
      "Entiendo perfectamente. Lo que incluye no es solo el material: es el diseño a medida, el montaje y desmontaje, " +
      "y que ese día no os preocupéis de nada. Puedo prepararos una versión ajustada priorizando lo que más ilusión os hace, " +
      "¿la vemos?",
  },
  {
    objecion: "«Nos lo estamos pensando»",
    respuesta:
      "¡Claro, es una decisión importante! ¿Hay algo en concreto que os haga dudar o que pueda aclararos? Y recordad que " +
      "para bloquear la fecha basta con la señal; el resto lo vamos afinando con calma.",
  },
  {
    objecion: "«Hemos visto algo más barato»",
    respuesta:
      "Es normal, hay opciones para todo. Nosotros cuidamos mucho el detalle, la calidad del material y que el montaje " +
      "quede impecable el día D. Si queréis, comparamos qué incluye cada propuesta y decidís con todo claro.",
  },
  {
    objecion: "«¿Podéis hacerlo por menos?»",
    respuesta:
      "Puedo adaptarlo a vuestro presupuesto sin que pierda fuerza: ajustamos alcance o cambiamos algún elemento por otro " +
      "que cunda más. Decidme con qué cifra os sentís cómodos y os propongo la mejor versión dentro de ahí.",
  },
];

// Argumentos de valor: por qué elegir TDO (para tenerlos a mano).
const ARGUMENTOS = [
  "Desde 2012 transformando fincas y espacios: más de una década creando bodas y eventos.",
  "Diseño a medida, no packs cerrados: cada evento refleja la personalidad de la pareja o cliente.",
  "Nos ocupamos de todo: proyecto, preparación, montaje y desmontaje. Vosotros solo disfrutáis.",
  "Equipo propio de diseño, producción y montaje.",
  "Diseño floral, artesanía y material propio cuidado y de calidad.",
  "Reseñas positivas de parejas y clientes, y proyectos publicados en medios especializados.",
  "Trato cercano y acompañamiento de principio a fin.",
];

// Cómo trabajamos, de principio a fin (para transmitir método y tranquilidad).
const PROCESO = [
  "Nos conocemos y escuchamos vuestras ideas.",
  "Diseñamos una propuesta personalizada.",
  "Preparamos cada elemento del proyecto.",
  "Realizamos el montaje y el desmontaje.",
];

// Servicios que ofrecemos (para enumerar de un vistazo).
const SERVICIOS = [
  "Ceremonias civiles y religiosas",
  "Bienvenida y seating plan",
  "Decoración floral y de mesas",
  "Photocalls y rincones especiales",
  "Cartelería personalizada",
  "Alquiler de mobiliario",
];

// Enlace de reservas de reunión (Calendly u otro): copiar/abrir y, si eres
// socio, editarlo. Incluye un mensaje listo con el enlace dentro.
function ReservaReunion({ calendlyUrl, esAdmin }: { calendlyUrl: string; esAdmin: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [url, setUrl] = React.useState(calendlyUrl);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function guardar() {
    setBusy(true);
    setError(null);
    try {
      await guardarCalendlyUrl(url);
      setEditando(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Mensajes listos con el enlace de reservas ya dentro, por situación.
  const mensajes: { titulo: string; texto: string }[] = calendlyUrl
    ? [
        {
          titulo: "General",
          texto:
            `¡Hola [nombre]! Para veros y contaros nuestra propuesta con calma, elige el hueco que mejor te venga ` +
            `aquí y nos organizamos: ${calendlyUrl} · ¡Nos vemos! 😊`,
        },
        {
          titulo: "Videollamada · Corporativo",
          texto:
            `Hola, [empresa]:\n\n` +
            `Selecciona en el calendario el día y la hora que mejor te vengan para presentarnos el evento y ` +
            `analizar con detalle sus necesidades: ${calendlyUrl}\n\n` +
            `Recibirás la confirmación y el enlace directo a la videollamada. Un saludo,\nTu Decoración Original`,
        },
        {
          titulo: "Videollamada · Bodas",
          texto:
            `Hola, [nombres]:\n\n` +
            `Seleccionad en el calendario el día y la hora que mejor os vengan para conocernos, contarnos cómo ` +
            `imagináis vuestra boda, explicaros cómo trabajamos y ver si podemos ayudaros: ${calendlyUrl}\n\n` +
            `Recibiréis la confirmación y el enlace de acceso a la videollamada. ¡Un abrazo!\nTu Decoración Original`,
        },
      ]
    : [];

  // Editor (socios) o invitación a configurarlo.
  if (editando || (!calendlyUrl && esAdmin)) {
    return (
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <CalendarClock size={15} className="text-clay" /> Enlace de reservas de reunión
          </span>
        </CardTitle>
        <p className="mb-2 mt-1 text-[12px] text-ink-muted">
          Pega tu enlace de Calendly (o similar) para que el equipo pueda enviarlo y el cliente elija
          hueco solo.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendly.com/tu-usuario/reunion"
            className="min-w-[240px] flex-1"
            autoFocus
          />
          <Button size="sm" onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          {calendlyUrl && (
            <Button size="sm" variant="ghost" onClick={() => { setEditando(false); setUrl(calendlyUrl); }}>Cancelar</Button>
          )}
        </div>
        {error && <p className="mt-2 text-caption text-error">{error}</p>}
      </Card>
    );
  }

  // Sin enlace y sin ser socio: no molestar.
  if (!calendlyUrl) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="!mb-0">
          <span className="flex items-center gap-2">
            <CalendarClock size={15} className="text-clay" /> Agenda una reunión
          </span>
        </CardTitle>
        {esAdmin && (
          <button onClick={() => setEditando(true)} className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-clay">
            <Pencil size={12} /> Cambiar enlace
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 truncate rounded-sm bg-beige-light px-3 py-1.5 text-[12.5px] text-sage hover:underline"
        >
          <ExternalLink size={13} /> {calendlyUrl}
        </a>
        <CopyBtn texto={calendlyUrl} />
      </div>
      <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        Mensajes listos (con el enlace dentro)
      </p>
      <div className="space-y-2">
        {mensajes.map((m) => (
          <div key={m.titulo} className="rounded-md border-hair border-border bg-beige-light/60 p-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <b className="text-[13px]">{m.titulo}</b>
                <p className="text-[11px] text-ink-muted">Copia y rellena los [corchetes].</p>
              </div>
              <CopyBtn texto={m.texto} />
            </div>
            <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-secondary">{m.texto}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CopyBtn({ texto }: { texto: string }) {
  const [ok, setOk] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={copiar}
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm border-med px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
        ok ? "border-ok bg-ok-tint text-ok" : "border-border bg-white text-ink-secondary hover:border-sage-300"
      }`}
    >
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

export function AyudasVentaClient({
  calendlyUrl = "",
  esAdmin = false,
}: {
  calendlyUrl?: string;
  esAdmin?: boolean;
}) {
  return (
    <div className="space-y-5">
      <ReservaReunion calendlyUrl={calendlyUrl} esAdmin={esAdmin} />

      {/* Plantillas de mensajes */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-clay" />
        <Overline className="!mt-0">Plantillas de mensajes</Overline>
      </div>
      <p className="-mt-2 text-[12.5px] text-ink-muted">
        Cópialas y rellena los <b>[corchetes]</b> ([nombre], [evento], [fecha], [importe]). Sirven
        para WhatsApp, email o donde escribas al cliente.
      </p>
      {PLANTILLAS.map((g) => (
        <Card key={g.grupo}>
          <CardTitle>{g.grupo}</CardTitle>
          <div className="mt-1 space-y-3">
            {g.items.map((p) => (
              <div key={p.titulo} className="rounded-md border-hair border-border bg-beige-light/60 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="text-[13px]">{p.titulo}</b>
                    <p className="text-[11px] text-ink-muted">{p.cuando}</p>
                  </div>
                  <CopyBtn texto={p.texto} />
                </div>
                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-secondary">{p.texto}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Rebatir objeciones */}
      <div className="flex items-center gap-2 pt-1">
        <Shield size={16} className="text-clay" />
        <Overline className="!mt-0">Rebatir objeciones</Overline>
      </div>
      <Card>
        <div className="space-y-3">
          {OBJECIONES.map((o) => (
            <div key={o.objecion} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="mb-1 flex items-start justify-between gap-2">
                <b className="text-[13px] text-clay-600">{o.objecion}</b>
                <CopyBtn texto={o.respuesta} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-secondary">{o.respuesta}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Argumentario */}
      <div className="flex items-center gap-2 pt-1">
        <Sparkles size={16} className="text-clay" />
        <Overline className="!mt-0">Por qué elegirnos (argumentario)</Overline>
      </div>
      <Card>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-ink-secondary">
          {ARGUMENTOS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Servicios que ofrecemos</CardTitle>
          <ul className="mt-1 grid gap-1.5 text-[13px] text-ink-secondary">
            {SERVICIOS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <Check size={13} className="shrink-0 text-sage" /> {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Cómo trabajamos</CardTitle>
          <ol className="mt-1 space-y-1.5 text-[13px] text-ink-secondary">
            {PROCESO.map((p, i) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-clay-tint text-[10px] font-bold text-clay-600">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
