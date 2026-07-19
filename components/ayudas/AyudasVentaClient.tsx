"use client";

import * as React from "react";
import { Copy, Check, MessageSquare, Shield, Sparkles } from "lucide-react";
import { Card, CardTitle, Overline } from "@/components/ui/card";

type Plantilla = { titulo: string; cuando: string; texto: string };
type Objecion = { objecion: string; respuesta: string };

// Plantillas de mensajes para la venta. Los [corchetes] son huecos a rellenar.
const PLANTILLAS: { grupo: string; items: Plantilla[] }[] = [
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
  "Diseño a medida, no packs cerrados: se adapta a vuestro estilo y espacio.",
  "Nos encargamos de todo el día D: montaje, desmontaje y logística.",
  "Material propio cuidado y de calidad (mobiliario, atrezzo, flor…).",
  "Experiencia en bodas, comuniones, corporativos y decoración de fincas.",
  "Trato cercano y acompañamiento de principio a fin.",
];

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

export function AyudasVentaClient() {
  return (
    <div className="space-y-5">
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
    </div>
  );
}
