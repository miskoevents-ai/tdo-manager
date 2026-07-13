import type { Metadata, Viewport } from "next";
import { Marcellus, Montserrat } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { getUsuarioActual } from "@/lib/sesion";
import { puedeAcceder } from "@/lib/secciones";

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
  const path = (await headers()).get("x-tdo-path") ?? "";

  // Control de acceso por sección: un usuario NO admin solo entra en las
  // pestañas que tenga concedidas (Inicio y Guía siempre). Los admins, todo.
  const bloqueado =
    Boolean(usuario) && !usuario!.esAdmin && Boolean(path) && !puedeAcceder(path, usuario!.permisos);

  return (
    <html lang="es" className={`${marcellus.variable} ${montserrat.variable}`}>
      <body>
        <Shell
          usuario={
            usuario ? { nombre: usuario.nombre, esAdmin: usuario.esAdmin, permisos: usuario.permisos } : null
          }
        >
          {bloqueado ? (
            <div className="mx-auto max-w-container-narrow py-16 text-center">
              <p className="font-display text-h3 text-sage">Sin acceso a esta sección</p>
              <p className="mt-2 text-small text-ink-secondary">
                No tienes permiso para ver esta pestaña. Si crees que deberías, pídeselo a un
                administrador del equipo.
              </p>
              <Link href="/" className="mt-4 inline-block rounded-sm bg-sage px-4 py-2 text-[13px] font-semibold text-white hover:bg-sage-600">
                Volver al inicio
              </Link>
            </div>
          ) : (
            children
          )}
        </Shell>
      </body>
    </html>
  );
}
