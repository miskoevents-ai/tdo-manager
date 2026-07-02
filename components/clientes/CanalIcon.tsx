import { Mail, Globe, Phone, ThumbsUp, HelpCircle } from "lucide-react";
import { CANAL_LABEL } from "@/lib/estados";

// Logos de marca (Instagram, WhatsApp) como SVG para que se reconozcan bien;
// el resto usa iconos lucide coherentes con el resto de la app.
function InstagramLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

function WhatsappLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-4.6 4.43c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.57.19 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41-.14-.01-.3-.01-.46-.01Z" />
    </svg>
  );
}

export function CanalIcon({ canal, size = 15 }: { canal: string; size?: number }) {
  switch (canal) {
    case "instagram":
      return <InstagramLogo size={size} />;
    case "whatsapp":
      return <WhatsappLogo size={size} />;
    case "email":
      return <Mail size={size} />;
    case "web_bodasnet":
      return <Globe size={size} />;
    case "telefono":
      return <Phone size={size} />;
    case "recomendacion":
      return <ThumbsUp size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
}

// Icono + etiqueta accesible (title/tooltip) para usar en tablas y tarjetas.
export function CanalBadge({ canal }: { canal: string }) {
  const label = CANAL_LABEL[canal] ?? canal;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sage-tint/60 text-sage"
    >
      <CanalIcon canal={canal} />
    </span>
  );
}
