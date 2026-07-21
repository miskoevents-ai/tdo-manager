# Repaso de eventos nuevos · verificado al céntimo (jul 2026)

Revisión de los presupuestos que dejó Álvaro. **Todos los costes cuadran** (doble
pasada). Para meterlos: ejecuta `scripts/seed-eventos-nuevos.sql` en Supabase
(inserta cada oportunidad + sus costes por zona) o téclealos a mano. Estado
puesto en `nueva` — ajústalo tú.

## 1) Boda Marina y Mariana — Finca San Antonio (27/09/2026)
- Hoyo de Manzanares · WhatsApp +52 1 55 3974 5852 · llegada 18:30 / ceremonia 19:30 / cóctel 20:15.
- **Costes verificados:** Atrezzo **546 €** + Logística **280 €** = **826 €**.
- ⚠️ **Dos modalidades a ofrecer** (lo pone el Excel): **C&C** (el cliente recoge/devuelve, solo atrezzo) = coste 546 € · **Con montaje/desmontaje** = coste 826 €.
- El *bastidor a medida del cartel* va a 0 € (la tela la aporta el cliente).
- **Precio orientativo** (evento propio, +6% contingencia, margen 30%, sin comisión aún):
  - C&C ≈ **830 €** · Con montaje ≈ **1.250 €** (base, sin IVA). Con comisión boda 6% subiría a ~1.370 €.

## 2) Producción Evento Daraki (21/01/2027) — corporativo
- Decoración por zonas: Entrada 1.420 · Lobby 700 · Planta 1 2.600 · Planta 2 1.400 · Planta 3 980 · Mobiliario 500 · Mano de obra/logística 2.520.
- **Coste verificado = 10.120 €.**
- ⚠️ **Falta la estantería de hierro 3×2** (a la espera de precio de *Crimons*) — añadir su coste cuando llegue; el 10.120 € NO la incluye.
- ⚠️ Desmontaje a las 00:00 (nocturnidad) — valorar recargo +25% en esa línea.
- **Precio orientativo:** ≈ **15.320 €** base (evento propio, +6%, margen 30%). Con comisión corporativo 7% ≈ **17.030 €** base. + lo que sume la estantería.

## 3) Boda Loreto y Javier (17/09/2027)
- **Coste verificado = 1.491 €** (Arreglos florales 959 € + Otros 532 €).
- Este evento **ya venía con precio puesto en el Excel: 3.073 € cobrado.**
- ⚠️ **Cuadre a revisar:** 3.073 − 1.491 = **1.582 €** de margen bruto; el Excel pone «beneficio 1.490 €» y «10% honorarios AGA 307 €», y esos números no reconcilian del todo (1.582 − 307 = 1.275, no 1.490). Revisar de dónde sale el 1.490.
- Aux 10 €/h, especializado 20 €/h (L–S sin nocturnidad).

## 4) Producción Mi Jardín Vertical (4–6/10/2026) — ya calculado antes
- Carpa Beduina 5.778 € + Green Patio 2.370 € = **8.148 €** de coste.
- Precio acordado con margen 30% + comisión 7%, ajustado a **13.900 € base** (Carpa 9.900 / Green 4.000) ≈ 16.819 € con IVA.
- No está en el SQL de arriba (ya lo tenías); si lo quieres cargar también, dilo.

---
### Notas de método
- Los costes se meten como **líneas de Coste (Previsto)** con su **zona** (para el subtotal por elemento) y su **categoría** (material / mano de obra / transporte / almacén).
- El **precio** se fija con la Calculadora (o a mano). Recuerda: hoy la Calculadora da UN precio por evento; para precio por elemento con margen propio está pendiente el desarrollo que hablamos.
