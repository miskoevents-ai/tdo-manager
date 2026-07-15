import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { UsuariosClient } from "@/components/usuarios/UsuariosClient";
import { AvisosEmailsForm } from "@/components/usuarios/AvisosEmailsForm";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getUsuarios, getUsoSemanal, semanaActual, getAvisosEmails } from "@/lib/data";
import { getUsuarioActual } from "@/lib/sesion";
import type { Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  // Un usuario debe ser admin; la contraseña compartida (llave maestra) también
  // puede gestionar (yo == null).
  const yo = await getUsuarioActual();
  if (yo && !yo.esAdmin) {
    return (
      <div className="space-y-3">
        <Overline className="!mt-0">Usuarios</Overline>
        <p className="text-small text-ink-secondary">Solo los administradores pueden gestionar los accesos del equipo.</p>
      </div>
    );
  }

  let usuarios: Usuario[];
  let usoSemana: Record<string, number>;
  let avisosEmails = "";
  try {
    [usuarios, usoSemana, avisosEmails] = await Promise.all([getUsuarios(), getUsoSemanal(), getAvisosEmails()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }
  const { lunes, domingo } = semanaActual();
  const rango = `${lunes.slice(8, 10)}/${lunes.slice(5, 7)}–${domingo.slice(8, 10)}/${domingo.slice(5, 7)}`;

  return (
    <div className="space-y-5">
      <InfoNote id="usuarios">
        Los accesos del equipo. Da de alta a alguien, elige a qué pestañas entra, ponle o quítale
        permisos de administrador, desactívalo o reinicia su contraseña. Cada uno entra con su
        usuario y todo queda registrado.
      </InfoNote>
      <Overline className="!mt-0">Usuarios del equipo</Overline>
      <UsuariosClient usuarios={usuarios} yoUsuario={yo?.usuario ?? ""} usoSemana={usoSemana} rangoSemana={rango} />

      <Overline>Avisos por email</Overline>
      <AvisosEmailsForm inicial={avisosEmails} />
    </div>
  );
}
