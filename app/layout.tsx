import type { Metadata, Viewport } from "next";
import { Marcellus, Montserrat } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
import { getUsuarioActual } from "@/lib/sesion";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TDO Manager",
  description: "Gestión de Tu Decoración Original",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3F4A36",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();
  return (
    <html lang="es" className={`${marcellus.variable} ${montserrat.variable}`}>
      <body>
        <Shell usuario={usuario ? { nombre: usuario.nombre, esAdmin: usuario.esAdmin } : null}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
