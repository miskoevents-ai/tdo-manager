# El modelo de costes de la calculadora — análisis y propuesta

*Documento para decidir entre los tres socios. Julio 2026.*

La duda que lo origina: *"¿Es real repartir los gastos fijos entre 6 eventos al mes?
¿Y qué pasa con los alquileres, que no consumen estructura? ¿Y el sueldo de
Cristina al 50%? ¿Qué margen aplicamos encima?"*

---

## 1 · Cómo funciona hoy (con los números reales)

Cada evento paga dos cosas:

**a) Sus costes directos** — lo que ese evento consume de verdad:
horas de Cristina (20 €/h), materiales, transporte, dietas, personal extra,
más dos colchones (contingencia 5 % sobre directos, mermas 3 % sobre materiales).

**b) Una cuota de estructura**, igual para todos los eventos:

| Concepto | €/mes |
|---|---:|
| Gastos fijos (local 1.200, autónomos 268, luz, agua, wifi, alarma, seguros, basuras, web, Airtable) | **1.807** |
| Parte "estructural" del sueldo de Cristina (50 % de 2.170) | **1.085** |
| **Total "la máquina"** | **2.892** |
| ÷ 6 eventos/mes | **≈ 482 € por evento** |

Es decir: antes de poner una flor, cada evento arranca con **482 €** de coste fijo.

---

## 2 · Lo que está BIEN calibrado (y no sabíamos)

**El coste/hora de Cristina es exacto.** Cristina cobra 2.170 €/mes por
25 h/semana ≈ 108 h/mes → **20,03 €/h de coste real**. La calculadora usa 20 €/h.
Clavado, no hay colchón escondido ahí.

**El reparto 50/50 del sueldo también cuadra… si se cumple una condición.**
El 50 % "estructural" (1.085 €) equivale a asumir que Cristina dedica la **otra
mitad** de su jornada (≈ 54 h/mes) a trabajo de eventos que se cobra por horas.
Con 6 eventos/mes, eso son **~9 h de Cristina por evento**. Para alquileres y
eventos pequeños es razonable; una boda sola ya consume ~32 h según nuestra
precarga. O sea:

- **Meses con mix normal** (1 boda + eventos medianos + alquileres) → el modelo
  recupera el sueldo casi exacto. Bien.
- **Meses cargados de bodas** → las horas cobradas superan las 54 h y encima
  cobramos el 1.085 fijo → recuperamos el sueldo **de más** (colchón, vamos algo
  caros). Conservador, no peligroso.
- **Meses flojos** → recuperamos de menos.

Conclusión: el 50 % no es un error, pero es una **foto fija de un mix que varía**.
La mejora natural es calcularlo de los **partes de horas reales** que Cristina ya
registra (su % real de horas en eventos), en vez de un 50 % a ojo.

---

## 3 · Los dos agujeros reales

### Agujero 1 — El "÷ 6" es una apuesta, no un dato

Esto se llama *costeo por absorción* y su fallo es conocido: si el número real de
eventos no es 6, **todos los precios están mal a la vez**:

- Con **4 eventos** reales: la estructura por evento era 723 €, cobramos 482 →
  se quedan ~1.900 €/mes de fijos sin cubrir.
- Con **10**: cada evento carga 482 cuando le tocaban 289 → vamos **caros** y
  perdemos trabajos que sí eran rentables.
- Y es un pez que se muerde la cola: mes flojo → precios más altos → menos
  ventas → mes más flojo.

Si de verdad hacemos ~6/mes de media, el número base está bien **hoy**. El
problema es que está **congelado en Ajustes** y nadie lo revisará cuando la
realidad cambie.

### Agujero 2 — Los alquileres no caben en este molde

Hoy un alquiler carga la **misma cuota de 482 €** que una boda. Resultado: la
calculadora "pide" 500 €+ por alquilar una mesa de 120 €, y en la práctica se
ignora. Un alquiler no consume la máquina: no hay montaje, ni asistencia, ni
personal. Es casi todo **contribución limpia**. No debe *cargar* estructura:
debe *ayudar a cubrirla*.

---

## 4 · La idea que lo ordena: separar dos preguntas

> **A) "¿Cubro la máquina este mes?"** → cuenta **mensual**, del negocio entero.
> **B) "¿Qué precio pongo a este trabajo?"** → cuenta **por trabajo**: sus
> costes + un margen sano.

Hoy metemos la respuesta de A dentro de cada B (los 482 €). Eso obliga a
adivinar el "6" y rompe con los alquileres. Separadas:

- Cada trabajo se cotiza por lo suyo → nunca se pierde dinero en un trabajo,
  haya el volumen que haya ese mes.
- La estructura es un **objetivo mensual** que cubren entre todos los trabajos
  (eventos **y** alquileres). El panel diría: *"llevas 2.100 € de 2.892 € de
  fijos cubiertos este mes"*. Es la pregunta que de verdad importa: ¿llego a
  fin de mes?

---

## 5 · Opciones

### Opción A — Retoque mínimo
1. Los alquileres **salen del reparto** de estructura y se cotizan aparte
   (coste + markup, con los mínimos ya aprobados: 450 € desplazado / 75 € entrega).
2. El "6" se vuelve **vivo**: media real de eventos de los últimos 3 meses, con
   suelo 4 y techo 8 para que un mes raro no dispare los precios.

*Poco esfuerzo, tapa los dos agujeros principales.*

### Opción B — Modelo de contribución puro
Se deja de clavar estructura en cada presupuesto. Cada trabajo = coste variable
+ margen. Panel de "cobertura de fijos del mes". *Lo más correcto a largo plazo,
pero cambia el chip de golpe.*

### Opción C — Híbrido (recomendada)
Cristina sigue viendo **exactamente lo mismo** (semáforo y precios), pero por
dentro:
1. **Alquileres fuera** del reparto → precio realista (coste + markup + mínimos).
2. **Divisor vivo** (media móvil de eventos reales, con suelo/techo) en vez del 6 fijo.
3. **Marcador "cobertura de fijos del mes"** en el Cuadro de mando: la verdad,
   visible para los tres socios.
4. Opcional: el 50 % del sueldo se calcula de los **partes de horas reales**
   en vez de a ojo.

*Mantiene la experiencia actual, tapa los agujeros, y da por primera vez la
foto real del mes.*

---

## 6 · ¿Qué margen aplicar encima?

Primero, una aclaración que cambia mucho: la herramienta usa **margen sobre
precio**, no *markup sobre coste*. "45 % de margen" = el beneficio es el 45 %
**del precio de venta** (equivale a coste × ~1,8). No es "sumar 45 % al coste"
(eso sería solo un 31 % de margen). Los tramos actuales están bien planteados.

Recomendación:

| Tipo | Verde | Ideal | Nota |
|---|---:|---:|---|
| Bodas / eventos grandes | 40 % | 45 % | Son los que cargan la máquina |
| Corporativo | 15 % | 45 % | **Decidido (jul 2026)**: banda propia, del 15 al 45. Aceptan margen bajo porque amortizan estructura; se intenta vender arriba |
| Temporada baja (solo bodas) | 25 % | 30 % | Ya implementado |
| **Alquileres** | — | — | **Sin %**: markup fijo (×2,5–3 sobre coste de desgaste/manejo) con los mínimos 450/75 como suelo |

El marco honesto para decidir el % no es por evento, es por mes:

```
1. Beneficio que queremos sacar los socios al mes        = objetivo
2. Máquina (2.892 €) + objetivo                          = contribución necesaria/mes
3. ÷ actividad realista del mes                          = contribución media por trabajo
4. De ahí sale el % — no al revés
```

Regla de oro: si el panel dice que no cubrimos la máquina, la palanca es
**volumen, el %, o bajar fijos** — nunca falsear un presupuesto suelto.

---

## 7 · Para decidir entre los tres

1. ¿Opción A, B o C?
2. Si C: ¿activamos también el punto 4 (sueldo por partes de horas reales)?
3. ¿Cuál es el "beneficio objetivo" mensual de los socios? (Para calibrar los
   márgenes con el marco del punto 6.)
