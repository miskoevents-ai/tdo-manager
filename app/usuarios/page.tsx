import Link from "next/link";
import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { UsuariosClient } from "@/components/usuarios/UsuariosClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getUsuarios } from "@/lib/data";
import { getUsuarioActual } from "@/lib/sesion";
import type { Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  const yo = await getUsuarioActual();
  if (!yo) {
    return (
      <div className="space-y-3">
        <Overline className="!mt-0">Usuarios</Overline>
        <p className="text-small text-ink-secondary">
          Entra con tu usuario (no con la contraseña compartida) para gestionar los accesos del
          equipo. <Link href="/login" className="text-sage hover:underline">Ir al login</Link>.
        </p>
      </div>
    );
  }
  if (!yo.esAdmin) {
    return (
      <div className="space-y-3">
        <Overline className="!mt-0">Usuarios</Overline>
        <p className="text-small text-ink-secondary">Solo los administradores pueden gestionar los accesos del equipo.</p>
      </div>
    );
  }

  let usuarios: Usuario[];
  try {
    usuarios = await getUsuarios();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="usuarios">
        Los accesos del equipo. Da de alta a alguien, ponle o quítale permisos de administrador,
        desactívalo o reinicia su contraseña. Cada uno entra con su usuario y todo queda registrado.
      </InfoNote>
      <Overline className="!mt-0">Usuarios del equipo</Overline>
      <UsuariosClient usuarios={usuarios} yoUsuario={yo.usuario} />
    </div>
  );
}
