# Tu Decoración Original — Design Tokens

> Documento de handoff para desarrollo. Valores exactos extraídos del sistema de
> diseño de marca. Pensado para aplicarse tal cual en **Next.js + Tailwind CSS**.
>
> **Marca:** Tu Decoración Original · Decoración para eventos y bodas (Madrid).
> **Contacto:** Cristina Díaz Torres · 675 75 87 83 · info@tudecoracionoriginal.es · www.tudecoracionoriginal.es
>
> Al final encontrarás bloques listos para copiar: `tokens.css` (CSS variables) y
> `tailwind.config.js`.

---

## 1. Paleta de colores

Base beige cálida heredada + **dos acentos**: verde salvia (primario) y
terracota/arcilla (secundario). Estados de baja saturación y cálidos.

### Neutros base (sistema beige)

| Nombre | HEX | Uso |
|---|---|---|
| `beige-bg` | `#F4EDE1` | Fondo de página |
| `beige-light` | `#FAF6EE` | Filas claras de tabla, paneles suaves |
| `beige-warm` | `#EAE0CF` | Cabeceras, totales, bandas de énfasis |
| `beige-deep` | `#E3D7C2` | Banda cálida más profunda / hover sobre banda |
| `white` | `#FFFFFF` | Tarjetas, superficies |
| `cream` | `#FCFAF5` | Superficie casi blanca cálida (texto sobre acento) |

### Bordes y líneas

| Nombre | HEX | Uso |
|---|---|---|
| `border` | `#D8CFBE` | Borde hairline por defecto |
| `border-soft` | `#E7DECD` | Separador más claro |
| `border-strong` | `#C7BBA4` | Borde enfatizado |

### Texto (ink)

| Nombre | HEX | Uso |
|---|---|---|
| `ink` | `#1F1F1F` | Texto principal |
| `ink-secondary` | `#555555` | Texto secundario |
| `ink-muted` | `#7C7468` | Texto atenuado cálido |
| `foot` | `#9A9A9A` | Pies de foto, captions, meta |

### Acento primario — Verde salvia

| Nombre | HEX | Uso |
|---|---|---|
| `sage` | `#3F4A36` | Acento de texto, filetes, botón primario |
| `sage-600` | `#4C5841` | Hover del primario |
| `sage-300` | `#8A957C` | Salvia atenuada (bordes en focus) |
| `sage-tint` | `#EEF1EA` | Wash de fondo salvia |
| `sage-tint-deep` | `#DFE6D6` | Wash salvia más profundo / bordes |

### Acento secundario — Terracota / arcilla

| Nombre | HEX | Uso |
|---|---|---|
| `clay` | `#BE6E4C` | Acento secundario, botón secundario |
| `clay-600` | `#A85C3C` | Hover del secundario |
| `clay-300` | `#D9A88E` | Arcilla atenuada |
| `clay-tint` | `#F4E4DA` | Wash de fondo arcilla |
| `clay-tint-deep` | `#EAD0C0` | Wash arcilla más profundo / bordes |

### Madera cálida (línea de alquiler rústico)

| Nombre | HEX | Uso |
|---|---|---|
| `wood` | `#B07F4F` | Detalle de madera / atrezo |
| `wood-deep` | `#8A5A36` | Madera profunda |

### Estados (cálidos, baja saturación)

| Nombre | HEX | Uso |
|---|---|---|
| `ok` | `#5B7350` | Éxito (texto/borde) |
| `ok-tint` | `#E9EFE3` | Fondo éxito |
| `warn` | `#B98A3E` | Aviso (texto/borde) |
| `warn-tint` | `#F6ECD7` | Fondo aviso |
| `error` | `#A65441` | Error (texto/borde) |
| `error-tint` | `#F3E0DA` | Fondo error |

### Alias semánticos (usar estos en componentes)

| Alias | Apunta a |
|---|---|
| `surface-page` | `beige-bg` |
| `surface-card` | `white` |
| `surface-raised` | `cream` |
| `surface-sunken` | `beige-light` |
| `surface-band` | `beige-warm` |
| `text-body` | `ink` |
| `text-secondary` | `ink-secondary` |
| `text-muted` | `ink-muted` |
| `text-caption` | `foot` |
| `text-on-accent` | `cream` |
| `accent` | `sage` |
| `accent-hover` | `sage-600` |
| `accent-tint` | `sage-tint` |
| `accent-2` | `clay` |
| `accent-2-hover` | `clay-600` |
| `accent-2-tint` | `clay-tint` |
| `line` | `border` |
| `line-soft` | `border-soft` |

---

## 2. Tipografía

Tres voces: **logo caligráfico** (intacto), **Marcellus** (display/títulos) y
**Montserrat** (cuerpo, UI, etiquetas y cifras). *Pinyon Script* solo para
floreos decorativos ocasionales, nunca en texto.

### Familias

| Rol | Familia (con fallbacks) | Origen |
|---|---|---|
| Display / títulos | `"Marcellus", "Cormorant Garamond", Georgia, serif` | Google Fonts *(NUEVA en la marca)* |
| Cuerpo / UI / cifras | `"Montserrat", "Helvetica Neue", Arial, sans-serif` | Google Fonts *(heredada)* |
| Script decorativo | `"Pinyon Script", "Snell Roundhand", cursive` | Google Fonts *(uso muy puntual)* |

**Carga (Google Fonts):**

```
https://fonts.googleapis.com/css2?family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Pinyon+Script&display=swap
```

En Next.js con `next/font/google`: importa `Marcellus` (400) y `Montserrat`
(300, 400, 500, 600, 700).

### Pesos (Montserrat)

| Token | Valor |
|---|---|
| `light` | 300 |
| `regular` | 400 |
| `medium` | 500 |
| `semibold` | 600 |
| `bold` | 700 |

*Marcellus se usa siempre en weight 400.*

### Escala de tamaños

| Token | rem | px | Uso |
|---|---|---|---|
| `display` | `4.5rem` | 72 | Hero display (Marcellus) |
| `h1` | `3rem` | 48 | Título 1 (Marcellus) |
| `h2` | `2.25rem` | 36 | Título 2 (Marcellus) |
| `h3` | `1.625rem` | 26 | Título 3 (Marcellus) |
| `h4` | `1.25rem` | 20 | Título 4 (Montserrat semibold) |
| `lead` | `1.25rem` | 20 | Párrafos de introducción (Montserrat light) |
| `body` | `1rem` | 16 | Texto normal |
| `small` | `0.875rem` | 14 | Texto pequeño |
| `caption` | `0.75rem` | 12 | Captions / pies |
| `overline` | `0.6875rem` | 11 | Etiquetas tracked (mayúsculas) |

### Interlineado (line-height)

| Token | Valor | Uso |
|---|---|---|
| `tight` | 1.08 | Display / H1 |
| `snug` | 1.25 | H2 / H3 / H4 |
| `normal` | 1.55 | Cuerpo |
| `relaxed` | 1.7 | Lead / párrafos largos |

### Tracking (letter-spacing)

| Token | Valor | Uso |
|---|---|---|
| `display` | `-0.01em` | Display / títulos grandes |
| `normal` | `0` | Cuerpo |
| `label` | `0.04em` | Etiquetas |
| `overline` | `0.22em` | **La firma:** overline en mayúsculas salvia sobre los títulos |

### Jerarquía canónica

- **Display:** Marcellus · 72px · lh 1.08 · ls −0.01em · weight 400 · color `ink`
- **H1:** Marcellus · 48px · lh 1.08 · weight 400
- **H2:** Marcellus · 36px · lh 1.25 · weight 400
- **H3:** Marcellus · 26px · lh 1.25 · weight 400
- **H4:** Montserrat · 20px · lh 1.25 · weight 600
- **Lead:** Montserrat · 20px · lh 1.7 · weight 300 · color `text-secondary`
- **Body:** Montserrat · 16px · lh 1.55 · weight 400 · color `ink`
- **Small:** Montserrat · 14px · lh 1.55 · color `text-secondary`
- **Caption:** Montserrat · 12px · lh 1.55 · color `foot`
- **Overline:** Montserrat · 11px · weight 600 · ls 0.22em · UPPERCASE · color `accent` (salvia)

---

## 3. Espaciado, radios, bordes, sombras y movimiento

### Escala de espaciado (base 4px)

| Token | rem | px |
|---|---|---|
| `space-0` | `0` | 0 |
| `space-1` | `0.25rem` | 4 |
| `space-2` | `0.5rem` | 8 |
| `space-3` | `0.75rem` | 12 |
| `space-4` | `1rem` | 16 |
| `space-5` | `1.5rem` | 24 |
| `space-6` | `2rem` | 32 |
| `space-7` | `3rem` | 48 |
| `space-8` | `4rem` | 64 |
| `space-9` | `6rem` | 96 |
| `space-10` | `8rem` | 128 |

Gutter por defecto = `space-5` (24px).

### Radios de esquina (contenidos, elegantes)

| Token | Valor | Uso |
|---|---|---|
| `radius-xs` | `3px` | Detalles mínimos |
| `radius-sm` | `6px` | Botones, inputs, selects |
| `radius-md` | `10px` | Botón lg |
| `radius-lg` | `16px` | Tarjetas |
| `radius-xl` | `24px` | Paneles grandes |
| `radius-pill` | `999px` | Badges y CTAs tipo pill |

### Anchos de borde

| Token | Valor |
|---|---|
| `bw-hair` | `1px` |
| `bw-med` | `1.5px` |
| `bw-thick` | `2px` |

### Sombras (cálidas, suaves, bajas — tinte marrón, no negro)

| Token | Valor |
|---|---|
| `shadow-xs` | `0 1px 2px rgba(60, 48, 30, 0.06)` |
| `shadow-sm` | `0 2px 8px rgba(60, 48, 30, 0.07)` |
| `shadow-md` | `0 8px 24px rgba(60, 48, 30, 0.09)` |
| `shadow-lg` | `0 18px 48px rgba(60, 48, 30, 0.12)` |
| `shadow-inset` | `inset 0 1px 0 rgba(255, 255, 255, 0.6)` |

### Focus ring

`0 0 0 3px rgba(63, 74, 54, 0.22)` — anillo salvia a 22% de opacidad.

### Layout

| Token | Valor |
|---|---|
| `container` | `1200px` |
| `container-narrow` | `820px` |

### Movimiento (calmado, sin rebotes)

| Token | Valor |
|---|---|
| `ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| `ease-in-out` | `cubic-bezier(0.45, 0, 0.25, 1)` |
| `dur-fast` | `140ms` |
| `dur-base` | `240ms` |
| `dur-slow` | `420ms` |

### Texturas (opcionales, CSS puro — «se sienten, no se ven»)

- **Grano de papel** (sobre fondos beige): superposición de gradientes muy suaves.
- **Seam** (separador de puntos), **rule** (filete con rombo salvia centrado) y
  **plain** (hairline). Ver `tokens.css` para el detalle.

---

## 4. Componentes

Valores exactos extraídos de los componentes React de la marca.

### Botón

Fuente `Montserrat` 600, **UPPERCASE**, `letter-spacing: 0.08em`, `line-height: 1.1`.
Borde `1.5px solid`. Press: `translateY(1px)`. Disabled: `opacity 0.5`.
Transición sobre `background/color/border-color` (`dur-base ease-out`) + `transform` (`dur-fast`).

**Tamaños**

| Size | Padding | Font | Radio |
|---|---|---|---|
| `sm` | `8px 16px` | `12px` | `radius-sm` (6px) |
| `md` | `12px 24px` | `13px` | `radius-sm` (6px) |
| `lg` | `16px 34px` | `14px` | `radius-md` (10px) |

**Variantes**

| Variante | Fondo | Texto | Borde | Hover |
|---|---|---|---|---|
| `primary` | `sage` `#3F4A36` | `cream` | `sage` | fondo → `sage-600` |
| `secondary` | `clay` `#BE6E4C` | `cream` | `clay` | fondo → `clay-600` |
| `outline` | transparente | `sage` | `border-strong` | fondo → `sage-tint`, borde → `sage-300` |
| `ghost` | transparente | `ink` | transparente | fondo → `beige-warm` |
| `link` | transparente | `clay` | transparente | texto → `clay-600` (sin uppercase, ls 0.02em, padding `4px 0`) |

### Tarjeta (Card)

- Fondo `white` + grano de papel muy sutil (gradientes).
- Borde `1px solid border` (`#D8CFBE`).
- Radio `radius-lg` (16px).
- Sombra: `shadow-sm` por defecto; `shadow-md` si `elevated`.
- `overflow: hidden`. Transición de sombra/transform (`dur-base ease-out`).
- Imagen de portada opcional (`aspect-ratio` por defecto `4 / 3`, `object-fit: cover`).
- Padding de contenido: `space-5` (24px).
- Eyebrow = overline (11px, 600, ls 0.22em, UPPERCASE, color `accent`).
- Título = Marcellus 1.5rem (24px), weight 400, color `ink`.

### Badge / etiqueta (pill)

`Montserrat` 600, `10.5px`, **UPPERCASE**, `letter-spacing: 0.08em`,
padding `4px 11px`, `border-radius: radius-pill`, `line-height: 1.3`.
Dos modos: **suave** (tint + texto de color + borde tint-deep) o **solid**
(fondo sólido + texto `cream`).

| Tono | Fondo (suave) | Texto (suave) | Borde (suave) | Fondo (solid) |
|---|---|---|---|---|
| `sage` | `sage-tint` | `sage` | `sage-tint-deep` | `sage` |
| `clay` | `clay-tint` | `clay-600` | `clay-tint-deep` | `clay` |
| `neutral` | `beige-warm` | `ink-secondary` | `border` | `ink-muted` |
| `ok` | `ok-tint` | `ok` | `ok` | `ok` |
| `warn` | `warn-tint` | `warn` | `warn` | `warn` |
| `error` | `error-tint` | `error` | `error` | `error` |

### Campo de formulario (Input / Select)

- **Label:** Montserrat 11px, weight 600, ls 0.08em, UPPERCASE, color `ink-secondary`.
- **Contenedor:** fondo `white`, borde `1.5px solid border` (`#D8CFBE`),
  radio `radius-sm` (6px), padding horizontal `14px`.
- **Texto/valor:** Montserrat 15px, color `ink`. Padding vertical `12px`.
- **Focus:** borde → `sage-300`, `box-shadow` = focus ring (`0 0 0 3px rgba(63,74,54,0.22)`).
- **Error:** borde → `error`.
- **Hint / error:** 12px, color `foot` (o `error`).
- **Select:** mismo estilo; chevron unicode `▼` (11px, `ink-muted`) a la derecha, padding derecho `38px`, `appearance: none`.
- Transición de `border-color` y `box-shadow` en `dur-base ease-out`.

---

## 5. Logo

Archivos incluidos en `logo/` (PNG con fondo transparente).

| Archivo | Dimensiones | Uso |
|---|---|---|
| `logo-calligraphy.png` | 2048×1319 | **Principal** — vertical, negro, alta resolución |
| `logo-horizontal.png` | 700×400 | Horizontal, negro (cabeceras, firmas) |
| `logo-cream.png` | 2048×1319 | Vertical en crema — **para fondos oscuros** |
| `logo-horizontal-cream.png` | 700×400 | Horizontal en crema — para fondos oscuros |
| `logo-on-beige.png` | 2048×1319 | Original sobre beige (referencia) |

**Formato:** solo hay **PNG** (transparente). No existe versión SVG en el material
entregado (ver Caveats). Para impresión a gran escala conviene solicitar el
**vectorial original (.ai/.svg)** al cliente.

**Zona de seguridad:** reservar un margen libre mínimo alrededor del logo igual a
**la altura de la letra «T» de "Tu"** (≈ 1× la altura de la caja de texto principal).
Como regla práctica para web: padding libre ≥ `space-5` (24px) alrededor del logo,
y **tamaño mínimo** de 120px de ancho (horizontal) / 90px de alto (vertical) para
que la caligrafía siga siendo legible. No recortar, rotar, deformar ni cambiar el
color del trazo caligráfico.

**Sobre fondo oscuro** usar siempre las variantes `-cream`.

---

## 6. Tono de marca

Cálido, artesanal, elegante y profesional. Hablamos en primera persona del plural
(«cuidamos cada proyecto») y nos dirigimos al cliente de tú («hagamos de tu evento
algo inolvidable»); cercanos pero cuidados, nunca coloquiales en exceso.

Lo comercial es emotivo y hecho a mano («cada rincón cuenta una historia»,
«decoraciones personalizadas y efímeras»); lo contractual es preciso y formal.
Español de España, títulos en mayúscula inicial (nunca todo mayúsculas salvo los
overlines tracked), cifras en formato español (`2.987,20 €`, `IVA 21%`) y **sin
emoji** en comunicación de marca. Vibe: elegancia natural, confianza y tranquilidad.

---

## Caveats (para el desarrollador)

- **Fuentes** se sirven vía Google Fonts. Para 100% offline, descarga los `.woff2`
  y sustituye por `@font-face`.
- **Marcellus** es una incorporación nueva a la marca (antes solo Montserrat). Si se
  prefiere otra serif, es un único cambio en la familia display.
- **Logo:** solo PNG disponible. Pide el vectorial (.ai/.svg) para impresión grande.
- Los importes/nombres de cliente que aparezcan en materiales de ejemplo son
  ilustrativos.

---

# Anexo A — `tokens.css` (copiar a `app/tokens.css` o `globals.css`)

```css
@import url("https://fonts.googleapis.com/css2?family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Pinyon+Script&display=swap");

:root {
  /* Neutros base */
  --beige-bg: #F4EDE1;
  --beige-light: #FAF6EE;
  --beige-warm: #EAE0CF;
  --beige-deep: #E3D7C2;
  --white: #FFFFFF;
  --cream: #FCFAF5;

  /* Bordes */
  --border: #D8CFBE;
  --border-soft: #E7DECD;
  --border-strong: #C7BBA4;

  /* Texto */
  --ink: #1F1F1F;
  --ink-secondary: #555555;
  --ink-muted: #7C7468;
  --foot: #9A9A9A;

  /* Salvia (primario) */
  --sage: #3F4A36;
  --sage-600: #4C5841;
  --sage-300: #8A957C;
  --sage-tint: #EEF1EA;
  --sage-tint-deep: #DFE6D6;

  /* Arcilla (secundario) */
  --clay: #BE6E4C;
  --clay-600: #A85C3C;
  --clay-300: #D9A88E;
  --clay-tint: #F4E4DA;
  --clay-tint-deep: #EAD0C0;

  /* Madera */
  --wood: #B07F4F;
  --wood-deep: #8A5A36;

  /* Estados */
  --ok: #5B7350;    --ok-tint: #E9EFE3;
  --warn: #B98A3E;  --warn-tint: #F6ECD7;
  --error: #A65441; --error-tint: #F3E0DA;

  /* Alias semánticos */
  --surface-page: var(--beige-bg);
  --surface-card: var(--white);
  --surface-raised: var(--cream);
  --surface-sunken: var(--beige-light);
  --surface-band: var(--beige-warm);
  --text-body: var(--ink);
  --text-secondary: var(--ink-secondary);
  --text-muted: var(--ink-muted);
  --text-caption: var(--foot);
  --text-on-accent: var(--cream);
  --accent: var(--sage);
  --accent-hover: var(--sage-600);
  --accent-tint: var(--sage-tint);
  --accent-2: var(--clay);
  --accent-2-hover: var(--clay-600);
  --accent-2-tint: var(--clay-tint);
  --line: var(--border);
  --line-soft: var(--border-soft);

  /* Tipografía */
  --font-display: "Marcellus", "Cormorant Garamond", Georgia, serif;
  --font-body: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  --font-ui: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  --font-script: "Pinyon Script", "Snell Roundhand", cursive;
  --w-light: 300; --w-regular: 400; --w-medium: 500; --w-semibold: 600; --w-bold: 700;
  --t-display: 4.5rem; --t-h1: 3rem; --t-h2: 2.25rem; --t-h3: 1.625rem; --t-h4: 1.25rem;
  --t-lead: 1.25rem; --t-body: 1rem; --t-small: 0.875rem; --t-caption: 0.75rem; --t-overline: 0.6875rem;
  --lh-tight: 1.08; --lh-snug: 1.25; --lh-normal: 1.55; --lh-relaxed: 1.7;
  --ls-display: -0.01em; --ls-normal: 0; --ls-label: 0.04em; --ls-overline: 0.22em;

  /* Espaciado */
  --space-0: 0; --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.5rem; --space-6: 2rem; --space-7: 3rem; --space-8: 4rem; --space-9: 6rem; --space-10: 8rem;

  /* Radios */
  --radius-xs: 3px; --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px; --radius-pill: 999px;

  /* Bordes */
  --bw-hair: 1px; --bw-med: 1.5px; --bw-thick: 2px;

  /* Sombras */
  --shadow-xs: 0 1px 2px rgba(60, 48, 30, 0.06);
  --shadow-sm: 0 2px 8px rgba(60, 48, 30, 0.07);
  --shadow-md: 0 8px 24px rgba(60, 48, 30, 0.09);
  --shadow-lg: 0 18px 48px rgba(60, 48, 30, 0.12);
  --shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --ring: 0 0 0 3px rgba(63, 74, 54, 0.22);

  /* Layout */
  --container: 1200px; --container-narrow: 820px; --gutter: var(--space-5);

  /* Movimiento */
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.25, 1);
  --dur-fast: 140ms; --dur-base: 240ms; --dur-slow: 420ms;

  /* Textura */
  --texture-paper:
    radial-gradient(circle at 20% 30%, rgba(190,110,76,0.018) 0, transparent 38%),
    radial-gradient(circle at 80% 70%, rgba(63,74,54,0.018) 0, transparent 40%),
    repeating-linear-gradient(115deg, rgba(120,100,70,0.012) 0 2px, transparent 2px 4px);
  --seam-dots: radial-gradient(circle, var(--border-strong) 1.1px, transparent 1.4px);
}
```

---

# Anexo B — `tailwind.config.js`

> Tailwind v3. Los tokens se exponen como utilidades (`bg-sage`, `text-ink`,
> `font-display`, `rounded-lg`, `shadow-md`, etc.). Para leer las CSS variables en
> vez de duplicar HEX, importa además `tokens.css` en tu entrypoint global.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        beige:  { bg: "#F4EDE1", light: "#FAF6EE", warm: "#EAE0CF", deep: "#E3D7C2" },
        cream:  "#FCFAF5",
        border: { DEFAULT: "#D8CFBE", soft: "#E7DECD", strong: "#C7BBA4" },
        ink:    { DEFAULT: "#1F1F1F", secondary: "#555555", muted: "#7C7468" },
        foot:   "#9A9A9A",
        sage:   { DEFAULT: "#3F4A36", 600: "#4C5841", 300: "#8A957C", tint: "#EEF1EA", "tint-deep": "#DFE6D6" },
        clay:   { DEFAULT: "#BE6E4C", 600: "#A85C3C", 300: "#D9A88E", tint: "#F4E4DA", "tint-deep": "#EAD0C0" },
        wood:   { DEFAULT: "#B07F4F", deep: "#8A5A36" },
        ok:     { DEFAULT: "#5B7350", tint: "#E9EFE3" },
        warn:   { DEFAULT: "#B98A3E", tint: "#F6ECD7" },
        error:  { DEFAULT: "#A65441", tint: "#F3E0DA" },
      },
      fontFamily: {
        display: ['"Marcellus"', '"Cormorant Garamond"', "Georgia", "serif"],
        body:    ['"Montserrat"', '"Helvetica Neue"', "Arial", "sans-serif"],
        script:  ['"Pinyon Script"', '"Snell Roundhand"', "cursive"],
      },
      fontSize: {
        display:  ["4.5rem",   { lineHeight: "1.08", letterSpacing: "-0.01em" }],
        h1:       ["3rem",     { lineHeight: "1.08" }],
        h2:       ["2.25rem",  { lineHeight: "1.25" }],
        h3:       ["1.625rem", { lineHeight: "1.25" }],
        h4:       ["1.25rem",  { lineHeight: "1.25" }],
        lead:     ["1.25rem",  { lineHeight: "1.7" }],
        body:     ["1rem",     { lineHeight: "1.55" }],
        small:    ["0.875rem", { lineHeight: "1.55" }],
        caption:  ["0.75rem",  { lineHeight: "1.55" }],
        overline: ["0.6875rem",{ lineHeight: "1.55", letterSpacing: "0.22em" }],
      },
      letterSpacing: { label: "0.04em", overline: "0.22em" },
      spacing: {
        1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.5rem",
        6: "2rem", 7: "3rem", 8: "4rem", 9: "6rem", 10: "8rem",
      },
      borderRadius: { xs: "3px", sm: "6px", md: "10px", lg: "16px", xl: "24px", pill: "999px" },
      borderWidth: { hair: "1px", med: "1.5px", thick: "2px" },
      boxShadow: {
        xs: "0 1px 2px rgba(60,48,30,0.06)",
        sm: "0 2px 8px rgba(60,48,30,0.07)",
        md: "0 8px 24px rgba(60,48,30,0.09)",
        lg: "0 18px 48px rgba(60,48,30,0.12)",
        ring: "0 0 0 3px rgba(63,74,54,0.22)",
      },
      maxWidth: { container: "1200px", "container-narrow": "820px" },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22,0.61,0.36,1)",
        "in-out": "cubic-bezier(0.45,0,0.25,1)",
      },
      transitionDuration: { fast: "140ms", base: "240ms", slow: "420ms" },
    },
  },
  plugins: [],
};
```
