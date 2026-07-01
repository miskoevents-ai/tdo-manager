import { ComingSoon } from "@/components/ComingSoon";
export default function Page() {
  return (
    <ComingSoon fase={2}>
      Panel mensual con ingresos cobrados, gastos, resultado y previsto por cobrar (regla §5.4:
      arranca en junio 2026, solo facturas propias + gastos fijos). Fase 2.
    </ComingSoon>
  );
}
