// Datos de la empresa para presupuestos, contratos y albaranes.
// EDITA aquí tus datos fiscales y de pago (o pídeselo a Claude).
// Los campos con "—" o "TODO" aparecerán en blanco / pendientes en el documento.

export const EMPRESA = {
  nombre: "Tu Decoración Original",
  razon_social: "Jerónimo Alonso Marcos", // titular (autónomo) de TDO
  nif: "51094870W", // NIF fiscal — sale en facturas y presupuestos
  direccion: "C/ Marroquina 24, 28030 Madrid",
  email: "info@tudecoracionoriginal.es",
  telefono: "675 75 87 83",
  web: "www.tudecoracionoriginal.es",
  // Datos de cobro (para la señal / transferencia)
  iban: "ES49 0049 1349 3820 1001 3751",
  titular_cuenta: "Jerónimo Alonso Marcos",
};

// Foto de portada de los presupuestos (idea de Cristina): una imagen de un
// montaje real de TDO que se imprime bajo la cabecera de todos los presus.
// Se prueban en orden (nombres en el bucket del catálogo, rutas de /public o
// URLs completas) y se usa la primera que cargue.
export const PORTADA_CANDIDATAS: string[] = [
  "portada-presupuesto",
  "portada-presupuesto.jpg",
  "portada-presupuesto.jpeg",
  "portada-presupuesto.png",
];

// Respaldo local si ninguna foto de arriba carga (banda con la marca).
export const PORTADA_RESPALDO = "/presupuesto-portada.jpg";

// Condiciones para EVENTOS (bodas, comuniones, corporativos, cumpleaños…):
// el servicio es diseño + producción + montaje/desmontaje. Editables.
export const CONDICIONES_EVENTO = [
  "Presupuesto válido durante 30 días desde su emisión.",
  "Para confirmar la fecha se abona una señal del 50 %; el resto antes o el día del evento.",
  "El precio incluye el diseño, la producción, el montaje y el desmontaje de la decoración según lo detallado.",
  "Cualquier cambio sobre lo presupuestado (nº de invitados, materiales o alcance) puede modificar el precio final.",
  "En caso de cancelación, la señal no es reembolsable: cubre el diseño, la reserva de la fecha y la compra de material.",
  "Precios con IVA incluido según se detalla. Las empresas aplican retención de IRPF del 15 %.",
];

// Condiciones para ALQUILER / ENCARGO de material: el servicio es prestar
// material, con entrega, recogida y fianza. Editables.
export const CONDICIONES_ALQUILER = [
  "Presupuesto válido durante 30 días desde su emisión.",
  "Para reservar el material se abona una señal del 50 % y, en su caso, una fianza reembolsable.",
  "El material se entrega y se recoge en las fechas y el lugar acordados.",
  "El cliente es responsable del material durante todo el periodo de alquiler.",
  "Los daños, roturas o pérdidas, así como la devolución en mal estado o fuera de plazo, se descontarán de la fianza.",
  "Precios con IVA incluido según se detalla. Las empresas aplican retención de IRPF del 15 %.",
];

// Condiciones para ENCARGO / PRODUCCIÓN a medida: fabricamos algo y se lo
// queda el cliente (no hay devolución ni fianza). Editables.
export const CONDICIONES_ENCARGO = [
  "Presupuesto válido durante 30 días desde su emisión.",
  "Para iniciar la producción se abona una señal del 50 %; el resto a la entrega.",
  "El precio incluye el diseño, los materiales y la fabricación del encargo según lo detallado.",
  "Los plazos de entrega se acuerdan al aceptar el presupuesto y pueden variar según la disponibilidad de materiales.",
  "Cualquier cambio sobre lo presupuestado (medidas, materiales o cantidades) puede modificar el precio final.",
  "Por tratarse de una fabricación a medida, el encargo no admite devolución y pasa a ser propiedad del cliente tras el pago completo.",
  "Precios con IVA incluido según se detalla. Las empresas aplican retención de IRPF del 15 %.",
];

// Devuelve las condiciones que corresponden a la oportunidad:
//   serie alquiler_encargo + esEncargo → condiciones de encargo/producción;
//   serie alquiler_encargo (alquiler)  → condiciones de alquiler;
//   el resto                            → condiciones de evento.
export function condicionesPara(serie: string | null | undefined, esEncargo = false): string[] {
  if (serie === "alquiler_encargo") return esEncargo ? CONDICIONES_ENCARGO : CONDICIONES_ALQUILER;
  return CONDICIONES_EVENTO;
}

// Alias retrocompatible (por defecto, condiciones de evento).
export const CONDICIONES_PRESUPUESTO = CONDICIONES_EVENTO;

// ---------------------------------------------------------------------------
// CONDICIONES GENERALES DE CONTRATACIÓN (página completa al final del PDF).
// Son las que protegen a la empresa (anulación, fianza, daños, propiedad…).
// BORRADOR pendiente de revisión legal — editable aquí. Detalle en
// docs/condiciones-presupuestos.md.
// ---------------------------------------------------------------------------
export type Clausula = { titulo: string; texto: string };

// Frase de aceptación que se imprime junto al total: al aceptar el presupuesto,
// el cliente acepta estas condiciones (que van dentro del propio documento).
export const NOTA_ACEPTACION =
  "La aceptación de este presupuesto implica la aceptación de las Condiciones Generales de Contratación que figuran al final de este documento.";

export const COND_GENERALES_ALQUILER: Clausula[] = [
  { titulo: "Tarifas y plazo", texto: "Salvo indicación expresa, los precios son sin impuestos, sin montaje y sin transporte, y para el plazo de uso indicado en el presupuesto. Todo uso superior a dicho plazo requerirá acuerdo previo y facturación complementaria. La fecha y hora de devolución del material son de obligado cumplimiento; todo retraso se facturará según la tarifa vigente." },
  { titulo: "Pedido y reserva", texto: "Para tramitar el pedido es imprescindible el presupuesto aceptado por el cliente y el pago de una señal a cuenta. No se consideran confirmados los pedidos que no reúnan ambos requisitos." },
  { titulo: "Transporte", texto: "Los costes de entrega y recogida se facturan según tarifa. Cualquier coste no previsto en el presupuesto inicial, así como los tiempos de espera, serán objeto de facturación complementaria." },
  { titulo: "Anulación", texto: "La anulación del pedido se facturará como mínimo al 50 % del total, y en ningún caso por importe inferior a los gastos ya ocasionados hasta el momento de la anulación. Si se produce con menos de 48 horas de antelación a la entrega, se facturará el 100 %." },
  { titulo: "Fianza", texto: "El cliente abona una cantidad en concepto de depósito y garantía, que se devolverá una vez retornado el material en buen estado y hecho efectivo el pago de la factura, salvo otro acuerdo entre las partes." },
  { titulo: "Entrega, inventario y devolución", texto: "El cliente reconoce recibir el material en buen estado, apto para su uso y en condiciones de limpieza e higiene. En la entrega y en la recogida se realizará un inventario con la asistencia del cliente o su representante; si no asiste, no se admitirá reclamación alguna sobre cantidad o estado del material. No se admitirán reclamaciones pasadas 24 horas desde la instalación o puesta a disposición." },
  { titulo: "Uso, daños y no devolución", texto: "El cliente se compromete a usar el material adecuadamente y a protegerlo de cualquier situación que pueda dañarlo (lluvia, viento, nieve, robo, destrozos, etc.). El suministro eléctrico y el cumplimiento de la normativa aplicable corren por su cuenta. No podrá manipular, modificar ni alterar el material. El material dañado o no devuelto se facturará por su valor de reposición a nuevo, incrementado, en su caso, con una indemnización por la indisponibilidad del material." },
  { titulo: "Pago", texto: "Mediante transferencia bancaria antes de la entrega del material, salvo otro acuerdo por escrito." },
  { titulo: "Reserva de propiedad", texto: "El material es propiedad de Tu Decoración Original; el cliente no podrá subarrendarlo ni cederlo por ningún concepto." },
  { titulo: "Responsabilidad", texto: "El cliente recibe el material en depósito y es responsable de su adecuada conservación desde la recepción. Como organizador del evento, será responsable de obtener los permisos necesarios y de que el lugar esté disponible y accesible sin dificultad." },
  { titulo: "Jurisdicción", texto: "Para cualquier discrepancia sobre la interpretación o el cumplimiento, las partes se someten a los juzgados y tribunales de Madrid." },
];

export const COND_GENERALES_ENCARGO: Clausula[] = [
  { titulo: "Validez", texto: "Presupuesto válido durante 30 días desde su emisión." },
  { titulo: "Pedido y señal", texto: "Para iniciar la producción se abona una señal del 50 %; el resto, a la entrega. Salvo indicación, el precio no incluye transporte ni montaje." },
  { titulo: "Alcance", texto: "El precio incluye el diseño, los materiales y la fabricación del encargo según lo detallado en el presupuesto." },
  { titulo: "Anulación", texto: "Una vez iniciada la producción, la anulación se facturará como mínimo al 50 %. Si el encargo ya está fabricado o los materiales adquiridos, se facturará hasta el 100 % (cubre diseño, materiales y mano de obra)." },
  { titulo: "Plazos y cambios", texto: "Los plazos de entrega se acuerdan al aceptar el presupuesto y pueden variar según la disponibilidad de materiales. Cualquier cambio sobre lo presupuestado (medidas, materiales o cantidades) puede modificar el precio final." },
  { titulo: "Naturaleza a medida", texto: "Por tratarse de una fabricación a medida, el encargo no admite devolución y pasa a ser propiedad del cliente tras el pago completo (reserva de dominio hasta el pago íntegro)." },
  { titulo: "Garantía", texto: "Se garantiza frente a defectos de fabricación. No cubre el mal uso, el desgaste natural ni daños por causas ajenas a la fabricación." },
  { titulo: "Pago e impuestos", texto: "Precios con IVA desglosado. Las empresas aplican retención de IRPF del 15 %. El pago se realiza por transferencia bancaria." },
  { titulo: "Jurisdicción", texto: "Las partes se someten a los juzgados y tribunales de Madrid." },
];

export const COND_GENERALES_EVENTO: Clausula[] = [
  { titulo: "Validez", texto: "Presupuesto válido durante 30 días desde su emisión." },
  { titulo: "Reserva de fecha", texto: "Para confirmar la fecha se abona una señal del 50 %; el resto, antes del evento o el mismo día." },
  { titulo: "Alcance", texto: "El precio incluye el diseño, la producción, el montaje y el desmontaje de la decoración según lo detallado. Transporte, permisos del recinto y suministros se incluyen solo si se indica expresamente." },
  { titulo: "Anulación", texto: "La señal no es reembolsable: cubre el diseño, la reserva de la fecha y la compra de material. Las cancelaciones con menos de 15 días de antelación al evento se facturarán al 100 % del total." },
  { titulo: "Cambios", texto: "Cualquier cambio sobre lo presupuestado (nº de invitados, alcance o materiales) puede modificar el precio final." },
  { titulo: "Montaje y acceso", texto: "El cliente garantiza el acceso al recinto, el suministro eléctrico y los permisos necesarios. Las esperas o los cambios solicitados in situ no previstos se facturarán aparte." },
  { titulo: "Material en el evento", texto: "El material de decoración que se instala y se retira sigue siendo propiedad de Tu Decoración Original; los daños o pérdidas causados durante el evento se facturarán al cliente." },
  { titulo: "Exterior y meteorología", texto: "En instalaciones al aire libre se recomienda un plan alternativo. Los daños derivados de la climatología (lluvia, viento…) correrán por cuenta del cliente si opta por mantener la instalación en exterior." },
  { titulo: "Responsabilidad", texto: "Tu Decoración Original responde de la correcta ejecución de su trabajo; el cliente, de los permisos y de las condiciones del recinto." },
  { titulo: "Pago e impuestos", texto: "Precios con IVA desglosado. Las empresas aplican retención de IRPF del 15 %." },
  { titulo: "Jurisdicción", texto: "Las partes se someten a los juzgados y tribunales de Madrid." },
];

// Condiciones generales completas según el tipo de operación (para la página
// final del PDF).
export function condicionesGeneralesPara(serie: string | null | undefined, esEncargo = false): Clausula[] {
  if (serie === "alquiler_encargo") return esEncargo ? COND_GENERALES_ENCARGO : COND_GENERALES_ALQUILER;
  return COND_GENERALES_EVENTO;
}
