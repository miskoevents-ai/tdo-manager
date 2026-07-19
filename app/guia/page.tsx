import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";
import { getUsuarioActual } from "@/lib/sesion";
import { puedeAcceder } from "@/lib/secciones";

export const dynamic = "force-dynamic";

// Guía de uso del TDO Manager, pestaña a pestaña, muy paso a paso. Cada
// sección solo se muestra a quien tiene acceso a esa parte de la herramienta:
// así el equipo ve exactamente lo que puede usar, sin secciones que le sobren.

function Seccion({
  id,
  titulo,
  emoji,
  children,
}: {
  id: string;
  titulo: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <h3 className="font-display text-[19px] text-sage">
        {emoji} {titulo}
      </h3>
      <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-ink-secondary">
        {children}
      </div>
    </Card>
  );
}

function Paso({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-[12px] font-semibold text-cream">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

// Pregunta frecuente (duda típica → respuesta corta).
function Duda({ p, children }: { p: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-beige-light/70 px-3 py-2">
      <div className="text-[12.5px] font-semibold text-ink">❓ {p}</div>
      <div className="mt-0.5 text-[12.5px]">{children}</div>
    </div>
  );
}

export default async function GuiaPage() {
  // Quién está mirando la guía: los socios (admin) ven todo; el resto ve solo
  // las secciones de las pestañas a las que tiene acceso. Sesión compartida
  // (sin usuario) → se muestra todo.
  const usuario = await getUsuarioActual();
  const esAdmin = usuario ? usuario.esAdmin : true;
  const permisos = usuario?.permisos ?? null;
  const ve = (ruta: string | null) => (ruta === null ? true : esAdmin ? true : puedeAcceder(ruta, permisos));

  // Cada sección con la ruta que la habilita (null = general, siempre visible).
  const SECCIONES: { id: string; label: string; ruta: string | null }[] = [
    { id: "ciclo", label: "El ciclo de un evento", ruta: null },
    { id: "basico", label: "Lo básico de moverse", ruta: null },
    { id: "inicio", label: "Inicio", ruta: null },
    { id: "oportunidades", label: "Oportunidades", ruta: "/oportunidades" },
    { id: "calendario", label: "Calendario", ruta: "/calendario" },
    { id: "tareas", label: "Tareas", ruta: "/tareas" },
    { id: "clientes", label: "Clientes", ruta: "/clientes" },
    { id: "catalogo", label: "Catálogo", ruta: "/catalogo" },
    { id: "inventario", label: "Inventario", ruta: "/inventario" },
    { id: "proveedores", label: "Proveedores", ruta: "/proveedores" },
    { id: "facturas", label: "Documentos", ruta: "/facturas" },
    { id: "comisiones", label: "Mis comisiones", ruta: null },
    { id: "fidelizacion", label: "Fidelización", ruta: "/fidelizacion" },
    { id: "pautas", label: "Pautas comerciales", ruta: null },
    { id: "tesoreria", label: "Tesorería", ruta: "/tesoreria" },
    { id: "contabilidad", label: "Contabilidad", ruta: "/contabilidad" },
    { id: "cuadro", label: "Cuadro de mando", ruta: "/cuadro-mando" },
    { id: "equipo", label: "Equipo", ruta: "/equipo" },
    { id: "trucos", label: "Trucos y detalles", ruta: null },
  ];
  const indice = SECCIONES.filter((s) => ve(s.ruta));

  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <div>
        <Overline className="!mt-0">Guía del TDO Manager</Overline>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Esta es <b>tu chuleta</b>. Está todo explicado paso a paso, pantalla por pantalla. Si
          alguna vez no sabes cómo hacer algo, <b>búscalo aquí primero</b> — casi seguro está. La
          idea de fondo es sencilla: <b>cada evento vive en una &quot;oportunidad&quot;</b>, y desde
          ahí salen solos el presupuesto, las reuniones, el material, la factura y el cobro. Si
          dudas dónde se hace algo, abre la oportunidad y busca la pestaña.
        </p>
        <p className="mt-1 text-[12px] text-ink-muted">
          Solo aparecen las secciones que tú puedes usar. Si te falta algo que necesitas, pídeselo
          a un socio.
        </p>
      </div>

      {/* Índice */}
      <Card>
        <Overline className="!mt-0">Índice — pincha para saltar</Overline>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {indice.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-[12.5px] font-semibold text-sage hover:underline">
              {s.label}
            </a>
          ))}
        </div>
      </Card>

      {/* --------------------------- GENERAL --------------------------- */}

      <Seccion id="ciclo" titulo="El ciclo de un evento (de principio a fin)" emoji="🔄">
        <p>Así va una boda o un alquiler desde que entra hasta que se cobra. No hace falta memorizarlo: la herramienta te lleva de la mano.</p>
        <ol className="mt-2 space-y-2.5">
          <Paso n={1}>
            <b>Entra la solicitud</b> → creas una oportunidad (estado &quot;Nueva&quot;). Es la ficha
            donde vivirá todo ese evento.
          </Paso>
          <Paso n={2}>
            <b>Hablas con el cliente</b> → apuntas la reunión en su pestaña Reuniones (sale en el
            Calendario). Vas cambiando el estado según avanza la conversación.
          </Paso>
          <Paso n={3}>
            <b>Preparas los costes</b> → en la pestaña Costes apuntas lo que vas a gastar (personas,
            gasolina, materiales…). La Calculadora lo lee y te dice a cuánto vender.
          </Paso>
          <Paso n={4}>
            <b>Haces el presupuesto</b> → vuelcas el precio de la Calculadora, lo afinas y lo mandas
            al cliente en PDF.
          </Paso>
          <Paso n={5}>
            <b>Confirma</b> → cambias el estado a &quot;Confirmada&quot; y reservas el material en la
            pestaña Material.
          </Paso>
          <Paso n={6}>
            <b>En producción</b> → mientras se prepara todo (material, fabricación…) puedes dejar el
            estado en &quot;En producción&quot;. <b>Facturar no cierra el evento</b>: se puede
            facturar por adelantado y seguir trabajando.
          </Paso>
          <Paso n={7}>
            <b>El día del evento</b> → montaje, evento y recogida ya están en el Calendario. Los
            gastos reales se apuntan en Costes.
          </Paso>
          <Paso n={8}>
            <b>Cerrar</b> → al terminar, «Dar por terminado» congela los costes reales y fija el
            margen. Si un evento ya pasó y sigue sin cerrar, te avisa.
          </Paso>
          <Paso n={9}>
            <b>Después</b> → devolver la fianza (te avisa solo) o retenerla por daños, y pedir la
            reseña en Fidelización. Y a por la siguiente 💪
          </Paso>
        </ol>
      </Seccion>

      <Seccion id="basico" titulo="Lo básico de moverse por la herramienta" emoji="🧭">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>El menú de la izquierda</b> son las secciones. Pinchas en una y se abre. La que estás
            viendo se queda marcada.
          </li>
          <li>
            <b>Las notas azules (ℹ️)</b> de arriba de cada pantalla explican en una frase qué es esa
            sección. Puedes cerrarlas con la ✕ y no vuelven a salir.
          </li>
          <li>
            <b>Guardar:</b> casi todo se guarda solo al escribir o al salir de la casilla. Cuando
            hay que pulsar un botón para guardar, lo verás claro (&quot;Guardar…&quot;).
          </li>
          <li>
            <b>Si te equivocas</b>, casi todo se puede editar o borrar. Tranquila, es difícil
            romper algo.
          </li>
          <li>
            <b>Entra siempre con tu usuario</b> (no con la contraseña general): así todo lo que
            haces queda firmado con tu nombre y los socios saben quién hizo qué.
          </li>
          <li>
            <b>En el móvil</b> el menú se abre con el botón ☰ de arriba a la izquierda.
          </li>
        </ul>
      </Seccion>

      <Seccion id="inicio" titulo="Inicio — tu panel de cada mañana" emoji="🏠">
        <p>Lo primero que ves al entrar. De un vistazo sabes qué tienes entre manos hoy.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Avisos</b> (arriba): lo que pide atención — leads sin contestar, eventos a menos de 7
            días, dobles reservas de material, tareas vencidas. Si Inicio está limpio, no se te
            escapa nada.
          </li>
          <li>
            <b>Esta semana</b>: la agenda de los próximos 7 días (reuniones, montajes, eventos).
          </li>
          <li>
            <b>Objetivo del mes</b> (socios): la barra de progreso de facturación. Se fija con
            «Editar» y mide lo vendido este mes (eventos contratados con fecha en el mes) contra la
            meta.
          </li>
          <li>
            <b>Próximos eventos y alquileres</b>: lo que viene, con su fecha y estado.
          </li>
        </ul>
        <Duda p="¿Por qué no veo las cifras de dinero (cobros, fianzas)?">
          Esas cifras (lo que hay pendiente de cobrar, fianzas…) son solo para los socios. Tú ves
          la parte operativa: agenda, avisos y próximos eventos. Es normal, no te falta nada.
        </Duda>
      </Seccion>

      {/* --------------------------- OPORTUNIDADES --------------------------- */}

      {ve("/oportunidades") && (
        <Seccion id="oportunidades" titulo="Oportunidades — el corazón de todo" emoji="🎯">
          <p>
            Aquí vive cada solicitud, boda, evento o alquiler, como una <b>tarjeta</b> en un tablero.
            Las columnas son el camino que recorre: <b>Nueva → Contestada → En conversación → Presup.
            enviado → Confirmada → Realizada → Facturada</b>.
          </p>

          <p className="pt-1 font-semibold text-ink">➕ Crear una oportunidad nueva</p>
          <ol className="space-y-2">
            <Paso n={1}>Botón <b>&quot;Nueva oportunidad&quot;</b> (arriba a la derecha).</Paso>
            <Paso n={2}>
              Rellena lo que sepas: <b>título</b> (ej. &quot;Boda Ana y Luis&quot;), <b>cliente</b> (lo
              eliges de la lista o lo creas al vuelo), <b>tipo</b> (boda, corporativo, alquiler…) y la{" "}
              <b>fecha del evento</b>. Lo demás se puede completar luego.
            </Paso>
            <Paso n={3}>
              Al poner la fecha del evento, se rellenan solas las de montaje y recogida (las puedes
              cambiar). <b>Si ese día ya hay otro evento, te avisa</b> justo debajo de la fecha.
            </Paso>
            <Paso n={4}>Guardar. Ya tienes la tarjeta creada, en la columna &quot;Nueva&quot;.</Paso>
          </ol>

          <p className="pt-1 font-semibold text-ink">↔️ Mover una tarjeta de columna (cambiar el estado)</p>
          <p>
            Dos formas: <b>arrastrarla</b> con el ratón a otra columna, o usar el <b>desplegable</b>{" "}
            que tiene cada tarjeta abajo. Cada columna muestra cuántas tarjetas tiene. Arriba puedes{" "}
            <b>buscar</b> y <b>ordenar</b> (por evento más próximo, por entrada reciente…).
          </p>
          <Duda p="Un cliente ha dicho que no. ¿Qué hago con su tarjeta?">
            En el desplegable de la tarjeta (o en la ficha) elige <b>&quot;Perdida&quot;</b> (nos
            dijeron que no) o <b>&quot;Rechazada&quot;</b> (la descartamos nosotros). Te preguntará{" "}
            <b>por qué</b> (precio, fecha ocupada, no responde, se fue con otro…): elígelo, que luego
            el <b>Cuadro de mando</b> te dice en qué se pierden más ventas (oro para ajustar precios y
            seguimiento). Sale del tablero activo y deja de dar la lata en avisos y calendario, pero
            no se borra: queda guardada en la sección plegable del final.
          </Duda>
          <Duda p="¿Qué es la «probabilidad de cierre» y para qué sirve?">
            Es el <b>% de que esa oportunidad acabe en dinero</b>. Sirve para ver el pipeline{" "}
            <b>ponderado</b>: en vez de «tengo 24k en el aire» (que nunca entran todos), ves lo que es{" "}
            <b>realista</b> que entre (cada oportunidad × su %). Va <b>sola según el estado</b> (Nueva
            10% · Contestada 25% · En conversación 45% · Presup. enviado 60% · Confirmada en adelante
            100% · Perdida/Rechazada 0%), pero puedes <b>fijarla a mano</b> al editar si hueles que una
            está casi hecha o muy fría (déjala en blanco para que siga al estado). El total ponderado
            sale arriba en <b>Oportunidades</b> y en el <b>Cuadro de mando</b> («Previsión del
            pipeline»); en cada tarjeta ves su % cuando aún no es venta segura.
          </Duda>
          <Duda p="Un alquiler o encargo se cobra parte con factura y parte «de amigos». ¿Cómo lo pongo?">
            Al crear o editar la oportunidad (si es <b>alquiler / encargo</b>) aparece el campo{" "}
            <b>&quot;% con factura&quot;</b> (por defecto 25%): lo que va con factura; el resto se cobra
            en efectivo. <b>No sale en el presupuesto</b>, pero sí en el <b>email al cliente</b> (dice la
            parte con factura y la parte en efectivo) y, al emitir la <b>factura</b>, esta se hace{" "}
            <b>solo por ese %</b>. Editable siempre.
          </Duda>

          <p className="pt-2 font-semibold text-ink">📂 La ficha de la oportunidad, pestaña a pestaña</p>
          <p>Al pinchar una tarjeta entras en su ficha. Arriba, los botones de PDF y acciones; debajo, las pestañas en el orden en que se trabajan:</p>

          <ul className="space-y-2.5">
            <li>
              <b>1 · Datos.</b> Cliente, lugar, fechas, canal por el que llegó, IVA/retención y{" "}
              <b>condiciones de pago</b> (ej. &quot;a 30 días&quot;). También las <b>horas de montaje y
              desmontaje</b>, la <b>logística del recinto</b> (accesos, muelle, montacargas…), la{" "}
              <b>persona de contacto</b> del cliente y, si el pedido se manda por mensajería, el{" "}
              <b>envío</b> (incluido en el precio o aparte). Y ves <b>&quot;Creada por&quot;</b> (quién dio
              de alta la oportunidad).
            </li>
            <li>
              <b>2 · Reuniones.</b> Las citas con el cliente.
              <ol className="mt-1 space-y-1.5">
                <Paso n="a">
                  <b>&quot;Nueva reunión&quot;</b> → fecha, hora, presencial u online. Si es online,
                  pega el enlace de la videollamada (Teams, Meet…). Sale sola en el Calendario.
                </Paso>
                <Paso n="b">
                  Botón <b>&quot;Pedir unión&quot;</b>: manda un email a los socios con el enlace para
                  que se unan a esa llamada.
                </Paso>
                <Paso n="c">
                  Icono de <b>acta 📄</b>: ahí pegas la <b>transcripción de la llamada</b> (lo que
                  saque Granola) y queda guardada en el evento.
                </Paso>
              </ol>
            </li>
            <li>
              <b>3 · Material.</b> Qué reservas del inventario y en qué fechas. <b>Las reservas se
              hacen aquí</b>, no en Inventario. Así el stock queda bloqueado y, si dos eventos piden
              lo mismo el mismo día, la herramienta avisa. Cada línea tiene su <b>estado</b>
              (reservado → entregado → devuelto). Si algo vuelve <b>roto, dañado o no vuelve</b>,
              marca <b>«Incidencia»</b> y anota unidades, tipo y coste de reposición. Y si pasa la
              fecha de devolución sin registrar la vuelta, te sale un aviso para cotejarlo.
            </li>
            <li>
              <b>4 · Costes.</b> Lo que vas a gastar (o gastaste), organizado por módulos tipo Excel:
              <b> mano de obra, transporte, dietas, materiales y alquiler externo</b>.
              <ol className="mt-1 space-y-1.5">
                <Paso n="a">
                  En cada módulo, <b>&quot;Añadir línea&quot;</b> y rellena las casillas (persona,
                  horas, €/hora; o concepto, cantidad, precio). El importe se calcula solo. Al elegir a
                  alguien del <b>equipo</b>, su <b>€/hora se rellena solo</b> con su coste real (en el caso
                  de la persona con sueldo, sale del sueldo del mes). También puedes marcar{" "}
                  <b>nocturnidad 🌙</b>, la <b>zona</b> del recinto, o dejar un coste <b>«por
                  confirmar»</b> si aún no tienes el precio del proveedor.
                </Paso>
                <Paso n="b">
                  En materiales, <b>&quot;Añadir del catálogo&quot;</b> te trae el artículo con su
                  precio; y puedes poner el <b>proveedor</b> y una <b>nota</b> por línea.
                </Paso>
                <Paso n="c">
                  Abajo pones el <b>% de contingencia</b> (colchón para imprevistos) y el{" "}
                  <b>margen objetivo</b>. Con eso la Calculadora ya sabe a cuánto vender.
                </Paso>
                <Paso n="d">
                  ¿Un evento parecido a otro? <b>&quot;Copiar costes de…&quot;</b> trae los de otra
                  oportunidad para no empezar de cero.
                </Paso>
                <Paso n="e">
                  Cuando el evento pasa y sabes el gasto <b>real</b>, cada línea se <b>cuadra</b> con
                  la flecha (tal cual o ajustando el importe): se convierte en gasto real y queda
                  marcada ✓. Al terminar, <b>&quot;Cerrar evento&quot;</b> congela los costes y deja
                  el margen definitivo (se puede reabrir). Si <b>no hubo sobrecostes</b>, el banner del
                  cierre te avisa de que la <b>contingencia no gastada se ha quedado como beneficio</b>.
                </Paso>
              </ol>
            </li>
            <li>
              <b>5 · Calculadora.</b> Te dice a cuánto vender para ganar dinero. Lee sola los costes
              que metiste.
              <ol className="mt-1 space-y-1.5">
                <Paso n="a">
                  Te muestra el <b>precio mínimo</b> y unas tarjetas rápidas de{" "}
                  <b>10 / 20 / 30 / 40 %</b> de margen, con el <b>⭐ Sugerido (30%)</b> destacado. Debajo,
                  una tabla con todos los márgenes. El <b>semáforo</b> compara el precio del presupuesto:
                  🟢 bien, 🟡 justo, 🔴 pierdes. Truco: <b>por encima del mínimo la estructura ya está
                  cubierta</b>, así que en trabajos con pocas horas un margen bajo (10–20%) también renta.
                </Paso>
                <Paso n="b">
                  Pulsa <b>&quot;Ver desglose del coste&quot;</b> para ver de dónde sale: horas, materiales,
                  transporte, <b>estructura por horas</b> (la parte de gastos fijos que arrastra cada hora
                  de trabajo) y <b>cuota de fijos</b>. No hay que tocar nada: sale solo.
                </Paso>
                <Paso n="c">
                  Si el servicio lleva desplazamiento (furgoneta + montaje), aplica el{" "}
                  <b>mínimo de proyecto</b> (chip 🚚): el precio no baja de ahí.
                </Paso>
                <Paso n="d">
                  Pulsa la fila del margen que quieras y <b>&quot;Volcar al presupuesto&quot;</b>:
                  pasa ese precio a la pestaña Presupuesto en una línea que luego puedes editar.
                </Paso>
                <Paso n="e">
                  Botón <b>&quot;Pedir validación a los socios&quot;</b> (en Presupuesto): les manda
                  un email para que revisen y den el OK. <b>Recuerda pedirlo en los presupuestos de
                  más de 2.000 €.</b>
                </Paso>
              </ol>
            </li>
            <li>
              <b>6 · Presupuesto.</b> Las líneas con precios; los totales se calculan solos.
              <ol className="mt-1 space-y-1.5">
                <Paso n="a">
                  <b>&quot;Añadir línea&quot;</b> a mano, o <b>&quot;Añadir del catálogo&quot;</b> (trae
                  concepto, precio y foto).
                </Paso>
                <Paso n="b">
                  Cada línea puede llevar <b>foto 📷</b>: de la <b>galería del catálogo</b> (icono de
                  imagen), <b>subida del ordenador</b>, o <b>pegando un enlace</b>. Sale en el PDF
                  junto al concepto.
                </Paso>
                <Paso n="c">
                  Botones <b>&quot;Presupuesto PDF&quot;</b> (descargar) y <b>&quot;Propuesta
                  visual&quot;</b> (versión bonita con fotos). Con <b>&quot;Enviar al cliente&quot;</b>{" "}
                  se abre el correo ya redactado (solo adjuntas el PDF).
                </Paso>
                <Paso n="d">
                  Antes de cambiar precios, <b>&quot;Guardar como V1/V2…&quot;</b>: congela esa
                  versión con su PDF, así sabes siempre qué vio el cliente y puedes volver atrás.
                </Paso>
                <Paso n="e">
                  Cuando el cliente acepta, pulsa <b>&quot;Presupuesto validado&quot;</b>: confirma la
                  oportunidad y <b>reserva solo el material del catálogo</b> que hay en el presupuesto,
                  para las fechas del evento. Un paso menos.
                </Paso>
              </ol>
            </li>
            <li>
              <b>7 · Cobros.</b> El dinero del evento y la fianza. Con el <b>plan de pagos</b> apuntas
              los cobros previstos (fecha + importe) y aparecen en el Calendario; si un plazo
              vence sin cobrarse, te avisa. La <b>fianza</b> tiene su propio panel con estado:
              <b> pendiente de cobro → en depósito → devuelta</b>, o <b>«retenida por daños»</b> si
              hay que quedarse (parte de) ella —eso se registra solo como ingreso en Tesorería.
            </li>
          </ul>
        </Seccion>
      )}

      {/* --------------------------- OPERATIVAS --------------------------- */}

      {ve("/calendario") && (
        <Seccion id="calendario" titulo="Calendario" emoji="📅">
          <p>
            Todo lo que tiene fecha, con colores: <b>bodas</b> (verde), <b>corporativos</b> (azul),{" "}
            <b>otros eventos</b> (arena), <b>reuniones</b> (morado), montajes, recogidas y
            devoluciones de material. Las oportunidades perdidas o rechazadas no salen.
          </p>
          <p>
            <b>Filtrar:</b> pulsa un tipo y ves solo ese; vuelve a pulsar para quitarlo;
            &quot;Todas&quot; lo restaura.
          </p>
          <p>
            <b>En el móvil:</b> se puede sincronizar con el calendario de tu teléfono (Google,
            Outlook, iPhone) con un enlace privado — pídeselo a Álvaro y se actualiza solo.
          </p>
        </Seccion>
      )}

      {ve("/tareas") && (
        <Seccion id="tareas" titulo="Tareas" emoji="✅">
          <p>
            La lista de recados del equipo. <b>Cualquiera asigna a cualquiera</b> (los socios a ti,
            tú a los socios…). Cada tarea lleva prioridad, fecha límite y puede ir enganchada a un
            evento.
          </p>
          <ol className="space-y-1.5">
            <Paso n={1}>Arriba eliges <b>quién eres</b> (se recuerda) y ves tus tareas.</Paso>
            <Paso n={2}>
              Cuando terminas una, la marcas <b>Hecha</b>. Si no puedes, pon <b>&quot;No
              puedo&quot;</b> y deja un comentario.
            </Paso>
            <Paso n={3}>Si una tarea vence sin hacerse, salta un aviso en Inicio.</Paso>
          </ol>
        </Seccion>
      )}

      {ve("/clientes") && (
        <Seccion id="clientes" titulo="Clientes" emoji="📇">
          <p>
            La agenda de contactos: nombre, teléfono, email, tipo (particular, empresa, finca,
            wedding planner), de dónde vino y notas.
          </p>
          <p>
            Al crear una oportunidad eliges el cliente de aquí (o lo creas en el momento). Si es{" "}
            <b>empresa</b>, el presupuesto sugiere solo la retención del −15%.
          </p>
        </Seccion>
      )}

      {ve("/catalogo") && (
        <Seccion id="catalogo" titulo="Catálogo" emoji="🖼️">
          <p>
            El escaparate: las referencias con foto, nombre y <b>precio de venta</b>, por categorías
            (centros de mesa, rincones de boda, iluminación, photocall…). Perfecto para enseñar en
            una reunión o pasar precios rápido.
          </p>
          <p>Tiene buscador (ignora acentos y mayúsculas) y las fotos se amplían al tocarlas.</p>
        </Seccion>
      )}

      {ve("/inventario") && (
        <Seccion id="inventario" titulo="Inventario" emoji="📦">
          <p>
            Todo el material físico: cuántas unidades hay, precio de alquiler, fianza sugerida y
            foto.
          </p>
          <p>
            Ojo: <b>las reservas se hacen desde la oportunidad</b> (pestaña Material), no aquí. Aquí
            solo consultas el material y su disponibilidad por fechas.
          </p>
        </Seccion>
      )}

      {ve("/proveedores") && (
        <Seccion id="proveedores" titulo="Proveedores" emoji="🚚">
          <p>
            La agenda de proveedores: floristas, alquiler de mobiliario, imprenta… con su contacto y
            sus datos.
          </p>
          <p>
            Los usas al planear los <b>costes</b> de un evento (columna &quot;Proveedor&quot; en las
            líneas de material y alquiler). Si te falta uno, lo das de alta aquí o directamente desde
            la casilla de proveedor con la opción <b>&quot;➕ Nuevo proveedor…&quot;</b>.
          </p>
        </Seccion>
      )}

      {ve("/facturas") && (
        <Seccion id="facturas" titulo="Documentos (facturas y presupuestos)" emoji="🧾">
          <p>
            El <b>archivo del negocio</b>: todas las facturas y presupuestos, cada uno con su número,
            su estado y su botón <b>PDF</b>. Arriba ves el <b>último número de cada serie y el
            siguiente</b>, para no tener que buscarlo.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Emitir factura</b> se hace desde la ficha de la oportunidad (botón &quot;Emitir
              factura&quot; o &quot;Validar y facturar&quot;). Le pone el número solo y congela sus
              importes.
            </li>
            <li>
              La columna <b>&quot;Vence&quot;</b> marca el límite de pago. Si pasa sin cobrarse, se
              pone <b className="text-error">roja</b> y avisa en Inicio.
            </li>
            <li>
              Cuando llega el dinero: botón <b>&quot;Cobrada&quot;</b>. No hay que apuntarlo en ningún
              otro sitio.
            </li>
          </ul>
        </Seccion>
      )}

      <Seccion id="comisiones" titulo="Mis comisiones" emoji="％">
        <p>
          Aquí ves <b>tus</b> comisiones: las de las oportunidades en las que figuras como
          responsable de comisión. Arriba, el resumen (<b>prevista, devengado, cobrado y
          pendiente</b>); debajo, el detalle por evento con su importe.
        </p>
        <p className="text-[12.5px] text-ink-muted">
          Cada persona ve solo las suyas. Ves la comisión <b>prevista</b> desde que la venta se
          cierra (confirmada, aún sin cobrar), y pasa a <b>devengada</b> cuando el evento se cobra.
          El <b>% depende del tipo de evento</b> (p. ej. un alquiler/encargo puede llevar un % y una
          boda otro). También aparece como línea informativa en <b>Costes → Previsto</b>.
        </p>
      </Seccion>

      {ve("/fidelizacion") && (
        <Seccion id="fidelizacion" titulo="Fidelización" emoji="💚">
          <p>
            Después de cada evento: <b>pedir la reseña</b> de Google (hay un botón con el enlace
            listo para mandar por WhatsApp) y apuntar si el cliente nos recomienda. Un cliente
            contento que deja reseña vale por dos campañas de publicidad.
          </p>
        </Seccion>
      )}

      <Seccion id="pautas" titulo="Pautas comerciales — cómo responder a las consultas" emoji="🧭">
        <p>
          El criterio acordado por los socios para responder solicitudes sin tener que
          preguntar cada vez. La clave es distinguir dos tipos de servicio:
        </p>
        <p>
          <b>1 · Alquiler con recogida en el estudio</b> (columpio, sofá, Chester…). Se acepta{" "}
          <b>siempre</b>, aunque haya evento ese día: no gasta equipo ni furgoneta. Precio de tarifa
          + fianza.
        </p>
        <p>
          <b>2 · Proyecto con desplazamiento</b> (furgoneta + montaje + desmontaje). Lleva un{" "}
          <b>mínimo de proyecto</b> (por defecto 450 € de base). La Calculadora lo aplica sola y
          pone el semáforo en rojo si el precio queda por debajo. Un <b>photocall</b> montado:
          orientativamente desde 600 €, o como añadido a otro servicio del mismo día.
        </p>
        <p>
          <b>¿Mismo día que una boda?</b> Montajes ligeros (tipo photocall) sí, siempre que los
          cubra alguien que no esté en la boda (p. ej. Juan Carlos). Un <b>segundo proyecto
          completo no se rechaza de entrada</b>: pásaselo a los socios, se mete en la herramienta
          con el coste del refuerzo externo y, si sale rentable y hay material y furgoneta, se coge.
        </p>
        <p>
          <b>Una sola pieza (cartel…):</b> recogida en estudio o envío; no desplazamos al equipo. Si
          piden entrega, se aplica el cargo de entrega (por defecto 75 €).
        </p>
        <p>
          <b>Piezas que no tenemos:</b> ofrece primero una alternativa del catálogo; si insisten,
          consúltalo — se compra solo si el proyecto la paga entera o si la vamos a realquilar.
        </p>
      </Seccion>

      {/* --------------------------- SOLO SOCIOS --------------------------- */}

      {ve("/tesoreria") && (
        <Seccion id="tesoreria" titulo="Tesorería" emoji="💶">
          <p>
            <b>El dinero de verdad</b>: cada euro que entra o sale, con su fecha y estado. Cobros de
            facturas, gastos de eventos, gastos fijos y reembolsos. El donut de <b>deudas</b>{" "}
            responde a &quot;¿a quién le debe dinero la sociedad ahora mismo?&quot;.
          </p>
          <p>
            En <b>Gastos fijos</b> (local, suministros, software, sueldos…) puedes <b>generar los del
            mes</b> de un clic y <b>filtrar</b> por texto, categoría, quién paga o estado, con el total
            €/mes de lo filtrado.
          </p>
        </Seccion>
      )}

      {ve("/contabilidad") && (
        <Seccion id="contabilidad" titulo="Contabilidad" emoji="📊">
          <p>
            ¿El negocio gana o pierde? Resumen mensual filtrado (solo lo que computa de verdad).{" "}
            <b>Tesorería = caja</b> (cuándo se mueve el dinero); <b>Contabilidad = resultado</b>{" "}
            (cómo va el negocio). Tres vistas: Oficial, Amigos y Global.
          </p>
        </Seccion>
      )}

      {ve("/cuadro-mando") && (
        <Seccion id="cuadro" titulo="Cuadro de mando" emoji="📈">
          <p>
            Los indicadores del negocio con perspectiva, para las decisiones de socios (Cristina no lo
            ve). Bajando por la página encuentras:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <b>Cobertura de fijos:</b> «la máquina» del mes (gastos fijos + el sueldo que aún no han
              recuperado las horas de eventos) contra lo que aportan los eventos. Te dice si llegas a
              fin de mes y <b>cuántos eventos faltan</b> para cubrirla.
            </li>
            <li>
              <b>Jornada de Cristina + calibración del modelo:</b> sus horas del mes vs. su contrato
              (repartidas en eventos y estructura) y, con los últimos 3 meses, el <b>«% horas a
              eventos»</b> y los <b>«eventos/mes» reales</b>. Si difieren de la calculadora, un botón{" "}
              <b>«Aplicar al modelo»</b> la afina con datos en vez de a ojo.
            </li>
            <li>
              <b>Rentabilidad</b> por tipo de evento, cliente y canal; y <b>precisión</b> presupuestando
              (lo estimado vs. lo que costó de verdad, para ir ajustando).
            </li>
          </ul>
        </Seccion>
      )}

      {ve("/equipo") && (
        <Seccion id="equipo" titulo="Equipo" emoji="👥">
          <p>
            Las personas que trabajan en los eventos. Cada una con su <b>€/hora</b>, y para quien tiene
            sueldo, sus <b>horas de contrato/semana</b> y sus <b>sueldos con vigencia</b> (en el panel de
            Sueldos). Con eso el sistema calcula su <b>coste real por hora</b> y lo autorrellena en Costes
            cuando la eliges — y se actualiza solo si el sueldo cambia de temporada.
          </p>
        </Seccion>
      )}

      <Seccion id="trucos" titulo="Trucos y detalles que ayudan" emoji="✨">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Pago a 30 días:</b> se pone en la ficha (Datos → Condiciones de pago) y las alarmas de
            cobro respetan el plazo — no dan la lata antes de tiempo.
          </li>
          <li>
            <b>¿Pagaste algo de tu bolsillo?</b> Apúntalo en Costes con tu nombre en &quot;quién
            paga&quot; y queda como reembolso pendiente hasta que la sociedad te lo devuelva.
          </li>
          <li>
            <b>Enviar presupuesto en 30 segundos:</b> &quot;Presupuesto PDF&quot; (descargar) +
            &quot;Enviar al cliente&quot; (abre el correo) + adjuntar el PDF.
          </li>
          <li>
            <b>El tablero en el móvil</b> se desliza en horizontal; las columnas del final están a la
            derecha.
          </li>
          <li>
            <b>Contraseña:</b> la app es privada del equipo. Entra siempre con tu usuario.
          </li>
        </ul>
        <p className="pt-1">
          ¿Algo no cuadra o se te ocurre una idea? Díselo a Álvaro y su asistente lo monta 😉
        </p>
      </Seccion>

      <p className="pb-4 text-center text-[11.5px] text-ink-muted">
        Tu Decoración Original · TDO Manager ·{" "}
        <Link href="/" className="text-sage hover:underline">
          volver a Inicio
        </Link>
      </p>
    </div>
  );
}
