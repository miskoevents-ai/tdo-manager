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

// Devuelve las condiciones que corresponden a la oportunidad según su serie:
// alquiler/encargo → condiciones de alquiler; el resto → condiciones de evento.
export function condicionesPara(serie: string | null | undefined): string[] {
  return serie === "alquiler_encargo" ? CONDICIONES_ALQUILER : CONDICIONES_EVENTO;
}

// Alias retrocompatible (por defecto, condiciones de evento).
export const CONDICIONES_PRESUPUESTO = CONDICIONES_EVENTO;
