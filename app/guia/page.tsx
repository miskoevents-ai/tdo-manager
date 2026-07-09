import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";

export const dynamic = "force-static";

// Guía de uso del TDO Manager, pestaña a pestaña, pensada para el equipo.
// Texto plano y ejemplos reales; sin datos sensibles.

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

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-[12px] font-semibold text-cream">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

const INDICE = [
  ["ciclo", "El ciclo completo de un evento"],
  ["inicio", "Inicio"],
  ["tareas", "Tareas"],
  ["oportunidades", "Oportunidades"],
  ["calendario", "Calendario"],
  ["facturas", "Documentos"],
  ["tesoreria", "Tesorería"],
  ["contabilidad", "Contabilidad"],
  ["cuadro", "Cuadro de mando"],
  ["inventario", "Inventario"],
  ["catalogo", "Catálogo"],
  ["equipo", "Equipo"],
  ["clientes", "Clientes"],
  ["fidelizacion", "Fidelización"],
  ["trucos", "Trucos y detalles"],
] as const;

export default function GuiaPage() {
  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <div>
        <Overline className="!mt-0">Guía del TDO Manager</Overline>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Todo lo que hace la plataforma, pestaña a pestaña. La idea de fondo es simple:{" "}
          <b>cada evento vive en una oportunidad</b>, y desde ahí salen solos el presupuesto, las
          reuniones, el material, la factura, el cobro y la contabilidad. Si alguna vez dudas dónde
          se hace algo, empieza por la oportunidad.
        </p>
      </div>

      {/* Índice */}
      <Card>
        <Overline className="!mt-0">Índice</Overline>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {INDICE.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-[12.5px] font-semibold text-sage hover:underline">
              {label}
            </a>
          ))}
        </div>
      </Card>

      <Seccion id="ciclo" titulo="El ciclo completo de un evento" emoji="🔄">
        <p>Así va una boda (o un alquiler) de principio a fin:</p>
        <ol className="mt-2 space-y-2.5">
          <Paso n={1}>
            <b>Entra la solicitud</b> → se crea en Oportunidades (estado &quot;Nueva&quot;). Si nadie la
            contesta en 48 h, salta un aviso en Inicio.
          </Paso>
          <Paso n={2}>
            <b>Reunión con los novios</b> → en la ficha, pestaña Reuniones: fecha, hora, presencial u
            online (con enlace de Teams), y quién la atiende. Sale en el Calendario.
          </Paso>
          <Paso n={3}>
            <b>Presupuesto</b> → pestaña Presupuesto: líneas con artículos del inventario, IVA y
            retención. Botón &quot;Presupuesto PDF&quot; para descargarlo y &quot;Enviar al cliente&quot; para
            mandarlo por correo (se abre ya redactado; solo hay que adjuntar el PDF).
          </Paso>
          <Paso n={4}>
            <b>Confirmación</b> → cambia el estado a &quot;Confirmada&quot; (desde el desplegable de la
            ficha o arrastrando en el kanban). Reserva el material en la pestaña Material para
            bloquear las fechas.
          </Paso>
          <Paso n={5}>
            <b>El día D</b> → montaje, evento y recogida ya están en el Calendario. Los gastos
            (gasolina, parking, compras de flores…) se apuntan en la pestaña Costes, diciendo{" "}
            <b>quién los pagó</b>.
          </Paso>
          <Paso n={6}>
            <b>Factura</b> → botón &quot;Emitir factura&quot; en la ficha. Se crea con su fecha de
            vencimiento (según las condiciones de pago del cliente) y deja automáticamente el cobro
            previsto en Tesorería.
          </Paso>
          <Paso n={7}>
            <b>Cobro</b> → cuando llega el dinero, en Facturas se pulsa &quot;Cobrada&quot;. El ingreso
            entra solo en la Contabilidad del mes. Si vence sin cobrar, avisa en rojo.
          </Paso>
          <Paso n={8}>
            <b>Después</b> → devolver la fianza (avisa solo), pedir la reseña en Fidelización, y a
            por la siguiente 💪
          </Paso>
        </ol>
      </Seccion>

      <Seccion id="inicio" titulo="Inicio" emoji="🏠">
        <p>
          El panel de cada mañana. Arriba, los <b>avisos</b> que piden acción: cobros vencidos,
          fianzas por devolver, leads sin contestar, eventos a menos de 7 días o dobles reservas de
          material. Debajo, <b>&quot;Esta semana&quot;</b>: la agenda de los próximos 7 días (reuniones,
          montajes, eventos, cobros). Y los números gordos: cobros pendientes, fianzas, eventos
          contratados y pipeline.
        </p>
        <p>Regla práctica: si Inicio está &quot;limpio&quot;, no se te escapa nada.</p>
      </Seccion>

      <Seccion id="oportunidades" titulo="Oportunidades" emoji="🎯">
        <p>
          El corazón de la plataforma: <b>cada solicitud, boda, evento corporativo o alquiler es una
          tarjeta</b> en el tablero. Las columnas son el camino: Nueva → Contestada → En conversación
          → Presup. enviado → Confirmada → Realizada → Facturada. Se arrastran con el ratón o se
          cambia el estado con el desplegable de cada tarjeta.
        </p>
        <p>
          Al abrir una tarjeta entras en su <b>ficha</b>, con 6 pestañas:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Datos</b> — cliente, lugar, fechas, canal, IVA/retención y condiciones de pago (ej. &quot;a 30 días&quot;).</li>
          <li><b>Reuniones</b> — citas con el cliente, con hora, modalidad y botón &quot;Unirse&quot; si es online.</li>
          <li>
            <b>Presupuesto</b> — las líneas con precios; los totales se calculan solos. Cada línea
            tiene su <b>vía</b>: &quot;Factura&quot; (lleva IVA, contabilidad oficial) o
            &quot;Efectivo&quot; (sin IVA, va a la vista Amigos). Así un mismo presupuesto puede ser
            mixto. La parte en efectivo <b>nunca sale en los documentos del cliente</b> (ni
            presupuesto ni factura): se ve solo en pantalla, en el panel interno 🔒 que no se
            imprime. Cada línea puede llevar <b>foto</b> 📷: de la galería del catálogo o pegando
            la URL de una imagen nueva (p. ej. creada con IA) — sale en el PDF junto al concepto. Antes de cambiar precios, botón{" "}
            <b>&quot;Guardar como V1/V2/V3…&quot;</b>: cada versión queda congelada con su PDF, se
            sabe siempre qué vio el cliente y se puede <b>restaurar</b> si la negociación vuelve
            atrás.
          </li>
          <li><b>Material</b> — qué se reserva del inventario y en qué fechas (controla el stock y avisa si te pasas).</li>
          <li>
            <b>Costes</b> — dos niveles: la <b>estimación previa</b> (los gastos que prevés antes
            del presu, con detalle de cantidad × precio — &quot;4 ramos de petunias a 2 €&quot; —,
            % de contingencia y margen objetivo → te sugiere el precio mínimo al cliente) y los{" "}
            <b>costes reales</b> (horas, desplazamientos y compras con su{" "}
            <b>foto del ticket</b> 📎), que son los que van a contabilidad. El resumen compara
            estimado vs real y te enseña la desviación y el <b>margen real</b> del evento. Al
            terminar, botón <b>&quot;Cerrar evento&quot;</b>: valida que no queden cobros ni
            reembolsos sueltos, congela los costes y deja el margen definitivo (se puede reabrir).
          </li>
          <li>
            <b>Cobros</b> — movimientos de dinero del evento y la fianza. Con el <b>plan de
            pagos</b> apuntas los cobros previstos (fecha + importe + con/sin IVA) y aparecen en el
            Calendario y en Tesorería.
          </li>
        </ul>
      </Seccion>

      <Seccion id="tareas" titulo="Tareas" emoji="✅">
        <p>
          La lista de tareas del equipo: <b>cualquiera asigna a cualquiera</b> (los socios a
          Cristina, Cristina a los socios…). Cada tarea lleva prioridad, fecha límite, y puede ir
          vinculada a un evento. Quien la recibe la marca <b>En curso</b>, <b>Hecha</b> o{" "}
          <b>&quot;No puedo&quot;</b> y puede dejar un comentario de respuesta.
        </p>
        <p>
          Arriba eliges <b>quién eres</b> (se recuerda en tu navegador) y ves tu panel con tus
          tareas; con los filtros ves las de cualquiera o las de todo el equipo. Si una tarea vence
          sin hacerse, salta un aviso en Inicio.
        </p>
      </Seccion>

      <Seccion id="calendario" titulo="Calendario" emoji="📅">
        <p>
          Todo lo que tiene fecha, en un vistazo y con colores: <b>bodas</b> (verde),{" "}
          <b>corporativos</b> (azul), <b>otros eventos</b> (arena), <b>reuniones</b> (morado),
          montajes, recogidas, salidas y devoluciones de material, cobros previstos y fianzas.
        </p>
        <p>
          <b>Filtrar:</b> pulsa un tipo y ves solo ese tipo; más pulsaciones suman o quitan;
          &quot;Todas&quot; lo restaura.
        </p>
        <p>
          <b>En el móvil:</b> el calendario se puede añadir a Google Calendar, Outlook o iPhone con
          un enlace privado (pedídselo a Álvaro), y se sincroniza solo — sin abrir la app.
        </p>
      </Seccion>

      <Seccion id="facturas" titulo="Documentos" emoji="🧾">
        <p>
          El <b>archivo del negocio</b>: todas las facturas y todos los presupuestos, cada uno con
          su número, su estado y su botón <b>PDF</b> para ver o imprimir el documento. Arriba se ve
          de un vistazo el <b>último número de cada serie y el siguiente</b> — se acabó buscar en
          el OneDrive cuál toca.
        </p>
        <p>
          Al emitir una factura, el manager le pone <b>su número solo</b> (serie propia: 26016,
          26017…) y <b>congela sus líneas e importes</b>: aunque luego se toque el presupuesto, la
          factura no cambia. La columna <b>&quot;Vence&quot;</b> marca el límite de pago según las
          condiciones del cliente (al momento, a 30 días…). Si una pasa de su fecha sin cobrarse,
          se pone <b className="text-error">roja con ⚠</b> y avisa en Inicio.
        </p>
        <p>
          Cuando llega el dinero: botón <b>&quot;Cobrada&quot;</b>. Con eso el cobro pasa a Tesorería como
          cobrado y entra en la Contabilidad del mes — no hay que apuntarlo en ningún otro sitio.
        </p>
        <p>
          Con <b>&quot;Nueva factura&quot;</b> se crea una factura a mano, sin pasar por una oportunidad:
          cliente con sus datos fiscales (o alta nueva), fechas, y líneas con su vía. Se puede{" "}
          <b>partir de un presupuesto enviado</b>: precarga cliente, líneas e impuestos y solo hay
          que retocar lo que cambie — menos teclear, menos errores. Las líneas en{" "}
          <b>efectivo no salen en el documento del cliente</b>: quedan como parte interna 🔒 (se ve
          debajo del documento, pero no se imprime) y su importe entra solo en la contabilidad de
          amigos.
        </p>
      </Seccion>

      <Seccion id="tesoreria" titulo="Tesorería" emoji="💶">
        <p>
          <b>El dinero de verdad</b>: cada euro que entra o sale, con su fecha y estado (previsto o
          pagado/cobrado). Aquí viven los cobros de facturas, los gastos de eventos, los gastos
          fijos del mes y los reembolsos.
        </p>
        <p>
          El donut de <b>deudas</b> responde a &quot;¿a quién le debe dinero la sociedad ahora
          mismo?&quot;: proveedores pendientes y personas que adelantaron dinero de su bolsillo
          (gasolina, parking, flores…). Cuando se paga o se reembolsa, se marca con el check y
          desaparece de la deuda.
        </p>
      </Seccion>

      <Seccion id="contabilidad" titulo="Contabilidad" emoji="📊">
        <p>
          ¿El negocio <b>gana o pierde</b>? Es el resumen mensual de Tesorería, pero filtrado: solo
          cuenta lo que computa de verdad (facturas propias cobradas y gastos fijos, desde junio
          2026). Los gastos de cada evento no van aquí — esos se miran en el margen de su ficha.
        </p>
        <p>
          Diferencia clave con Tesorería: <b>Tesorería = caja</b> (cuándo se mueve el dinero);{" "}
          <b>Contabilidad = resultado</b> (cómo va el negocio mes a mes).
        </p>
        <p>
          Tiene <b>tres vistas</b>: <b>Oficial</b> (la de siempre, §5.4), <b>Amigos</b> (las
          aportaciones sin factura de los préstamos a amigos) y <b>Global</b> (todo junto). Los
          préstamos a amigos se crean como oportunidad con operación &quot;Amigos/préstamo&quot; — así
          su material queda reservado igual — y su dinerillo entra solo en la vista Amigos.
        </p>
      </Seccion>

      <Seccion id="cuadro" titulo="Cuadro de mando" emoji="📈">
        <p>
          Los indicadores del negocio para mirar con perspectiva: facturación, conversión de
          solicitudes, canales que traen clientes, tiempos de cierre… Para las decisiones de
          socios, no para el día a día.
        </p>
      </Seccion>

      <Seccion id="inventario" titulo="Inventario" emoji="📦">
        <p>
          Todo el material físico: cuántas unidades hay, precio de alquiler, fianza sugerida y
          foto. El buscador ignora acentos y mayúsculas.
        </p>
        <p>
          Lo importante: <b>las reservas se hacen desde la oportunidad</b> (pestaña Material), no
          aquí. Así el stock queda bloqueado por fechas y si dos eventos piden lo mismo el mismo
          día, salta un aviso de doble reserva.
        </p>
      </Seccion>

      <Seccion id="catalogo" titulo="Catálogo" emoji="🖼️">
        <p>
          El escaparate: las referencias con foto, nombre y <b>precio de venta</b> (tarifario 2026),
          organizadas por categorías (centros de mesa, rincones de boda, iluminación, photocall…).
          Perfecto para enseñar en una reunión con novios o pasar precios rápido. Tiene buscador y
          las fotos se amplían al tocarlas.
        </p>
      </Seccion>

      <Seccion id="equipo" titulo="Equipo" emoji="👥">
        <p>
          Las personas que trabajan en los eventos, con su precio/hora. Se usa al imputar horas en
          los Costes de cada evento y para saber quién atiende cada reunión. También alimenta el
          desplegable de &quot;quién pagó&quot; los gastos.
        </p>
      </Seccion>

      <Seccion id="clientes" titulo="Clientes" emoji="📇">
        <p>
          La agenda: contacto, tipo (particular, empresa, finca, wedding planner), de dónde vino y
          sus notas. Al crear una oportunidad se elige el cliente de aquí (o se crea al vuelo). Si
          es <b>empresa</b>, el presupuesto sugiere la retención del −15% solo.
        </p>
      </Seccion>

      <Seccion id="fidelizacion" titulo="Fidelización" emoji="💚">
        <p>
          Después de cada evento: <b>pedir la reseña</b> de Google (hay botón con el enlace listo
          para mandar por WhatsApp) y apuntar si el cliente nos recomienda. Un cliente contento que
          deja reseña y recomienda vale por dos campañas de publicidad.
        </p>
      </Seccion>

      <Seccion id="trucos" titulo="Trucos y detalles que molan" emoji="✨">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Pago a 30 días:</b> se pone en la ficha (Datos → Condiciones de pago) y las alarmas
            de cobro respetan el plazo — no dan la lata antes de tiempo.
          </li>
          <li>
            <b>¿Pagaste algo de tu bolsillo?</b> Apúntalo en Costes con tu nombre en &quot;Pagado
            por&quot; y quedará como reembolso pendiente hasta que la sociedad te lo devuelva.
          </li>
          <li>
            <b>Proveedor nuevo:</b> en las compras, última opción del desplegable &quot;➕ Nuevo
            proveedor…&quot; — se crea su ficha sin salir del formulario.
          </li>
          <li>
            <b>Enviar presupuesto:</b> &quot;Presupuesto PDF&quot; (descargar) + &quot;Enviar al
            cliente&quot; (abre el correo redactado) + adjuntar el PDF = 30 segundos.
          </li>
          <li>
            <b>El kanban en el móvil</b> se desliza en horizontal — las columnas del final
            (Realizada, Facturada) están a la derecha.
          </li>
          <li>
            <b>Las notas azules</b> de cada pantalla (ℹ️) explican qué es cada sección; se pueden
            cerrar y no vuelven a salir.
          </li>
          <li>
            <b>Contraseña:</b> la app es privada del equipo. Si se cambia la contraseña, todas las
            sesiones se cierran solas.
          </li>
        </ul>
        <p className="pt-1">
          ¿Algo que no cuadra o una idea nueva? Se lo decís a Álvaro y su asistente lo monta 😉
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
