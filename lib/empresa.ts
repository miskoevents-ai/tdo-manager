// Datos de la empresa para presupuestos, contratos y albaranes.
// EDITA aquí tus datos fiscales y de pago (o pídeselo a Claude).
// Los campos con "—" o "TODO" aparecerán en blanco / pendientes en el documento.

export const EMPRESA = {
  nombre: "Tu Decoración Original",
  razon_social: "", // p. ej. "Álvaro Sarmiento — TDO" o la SL, si la hay
  nif: "", // NIF/CIF — rellénalo para que salga en el presupuesto
  direccion: "Madrid",
  email: "", // email de contacto
  telefono: "", // teléfono de contacto
  web: "@tudecoracionoriginal", // Instagram / web
  // Datos de cobro (para la señal / transferencia)
  iban: "", // IBAN — rellénalo para que aparezca en el documento
  titular_cuenta: "",
};

// Foto de portada de los presupuestos (idea de Cristina): una imagen de un
// montaje real de TDO que se imprime bajo la cabecera de todos los presus.
// Acepta: ruta en /public ("/presupuesto-portada.jpg"), URL completa, o el
// nombre de un archivo subido al bucket del catálogo en Supabase Storage
// (p. ej. "portada-presupuesto.jpg"). null para desactivarla.
export const PORTADA_PRESUPUESTO: string | null = "portada-presupuesto";

// Respaldo local si la foto de arriba no carga (banda con la marca).
export const PORTADA_RESPALDO = "/presupuesto-portada.jpg";

// Condiciones por defecto del presupuesto (editables).
export const CONDICIONES_PRESUPUESTO = [
  "Presupuesto válido durante 30 días desde su emisión.",
  "Para confirmar la reserva de fecha y material se abona una señal del 50 %; el resto antes o el día del evento.",
  "El material de alquiler se entrega y recoge en las fechas acordadas. Cualquier daño o pérdida se descontará de la fianza.",
  "Precios con IVA incluido según se detalla. Las empresas aplican retención de IRPF del 15 %.",
];
