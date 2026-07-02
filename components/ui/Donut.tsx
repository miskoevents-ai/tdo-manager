// Donut chart ligero en SVG (sin dependencias). Cada segmento es un arco del
// anillo. Pensado para desgloses pequeños (deudas por acreedor, gastos por
// categoría…). El centro puede mostrar un total.

export type DonutSeg = { label: string; value: number; color: string };

// Paleta on-brand (tierras: salvia, terracota, ocres, verdes) reutilizable.
export const DONUT_COLORS = [
  "#3F4A36", // salvia
  "#BE6E4C", // terracota / clay
  "#8FA37E", // sage claro
  "#D2A15E", // ocre
  "#6E7B57", // verde oliva
  "#C98A6A", // clay claro
  "#A8B695", // verde salvia claro
  "#E0B579", // arena
  "#566047", // salvia oscuro
  "#9A5A3E", // terracota oscuro
];

export function Donut({
  segments,
  size = 148,
  thickness = 20,
  centerLabel,
  centerSub,
}: {
  segments: DonutSeg[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* Aro de fondo suave */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#EFE7D8"
          strokeWidth={thickness}
        />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acc}
              strokeLinecap="butt"
            />
          );
          acc += dash;
          return el;
        })}
      </g>
      {centerLabel && (
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-ink font-display"
          style={{ fontSize: 18 }}
        >
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text
          x="50%"
          y="61%"
          textAnchor="middle"
          className="fill-ink-muted"
          style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {centerSub}
        </text>
      )}
    </svg>
  );
}
