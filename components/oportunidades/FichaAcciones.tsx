"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirFactura, toggleFianzaDevuelta } from "@/app/actions";

export function EmitirFacturaBtn({ oportunidadId }: { oportunidadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await emitirFactura(oportunidadId);
          router.push("/facturas");
        } finally {
          setLoading(false);
        }
      }}
    >
      <FileText size={14} /> {loading ? "Emitiendo…" : "Emitir factura"}
    </Button>
  );
}

export function FianzaBtn({
  oportunidadId,
  devuelta,
}: {
  oportunidadId: string;
  devuelta: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await toggleFianzaDevuelta(oportunidadId, !devuelta);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <RotateCcw size={14} /> {devuelta ? "Marcar no devuelta" : "Marcar fianza devuelta"}
    </Button>
  );
}
