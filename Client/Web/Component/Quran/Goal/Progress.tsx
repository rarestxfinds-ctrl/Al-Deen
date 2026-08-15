interface Progress_Ring_Props {
  value: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  color?: string;
  variant?: "solid" | "segmented";
  segments?: number;
}

export function Progress_Ring({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  color = "hsl(var(--primary))",
  variant = "solid",
  segments = 48,
}: Progress_Ring_Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const offset = circumference - pct * circumference;

  const segLen = circumference / segments;
  const dashOn = segLen * 0.62;
  const dashOff = segLen - dashOn;

  // For segmented: render full faint segmented track, then a second arc on top
  // that shows only the active portion using the same dash pattern.
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        {variant === "segmented" ? (
          <>
            {/* faint segmented track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashOn} ${dashOff}`}
              opacity={0.55}
            />
            {/* active arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashOn} ${dashOff}`}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
              style={{ strokeDashoffset: -((1 - pct) * circumference) }}
            />
          </>
        ) : (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
