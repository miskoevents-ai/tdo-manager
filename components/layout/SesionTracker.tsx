"use client";

import * as React from "react";

// Cuenta el tiempo que el usuario pasa con la pestaña visible y lo va enviando
// al servidor en "latidos". Solo suma tiempo en primer plano.
export function SesionTracker() {
  React.useEffect(() => {
    let last = Date.now();
    let acumulado = 0; // segundos pendientes de enviar

    function enviar(usarBeacon = false) {
      const secs = Math.round(acumulado);
      if (secs <= 0) return;
      acumulado = 0;
      const body = JSON.stringify({ segundos: secs });
      if (usarBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/heartbeat", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }

    function tick() {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        // Cap de 120 s por si el equipo estaba suspendido: no inflamos el total.
        acumulado += Math.min((now - last) / 1000, 120);
      }
      last = now;
      if (acumulado >= 30) enviar();
    }

    const iv = setInterval(tick, 20000);
    const onVis = () => {
      tick();
      if (document.visibilityState === "hidden") enviar(true);
    };
    const onHide = () => {
      tick();
      enviar(true);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);

    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      tick();
      enviar(true);
    };
  }, []);

  return null;
}
