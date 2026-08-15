import { cn } from "@/Library/utils";
import { useRef, useEffect, useState, ReactNode } from "react";

interface SlidingPillOption {
  id: string;
  icon?: ReactNode;
  label?: string;
}

interface SlidingPillProps {
  options: SlidingPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SlidingPill({ options, value, onChange, className, size = "sm" }: SlidingPillProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const activeBtn = buttonRefs.current.get(value);
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [value, options]);

  const hasLabels = options.some(o => o.label);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center p-1 rounded-full bg-muted/60 backdrop-blur-sm",
        className
      )}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 rounded-full bg-foreground/10 backdrop-blur-sm shadow-sm transition-all duration-300 ease-in-out"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          height: `calc(100% - 8px)`,
        }}
      />

      {options.map((option) => (
        <button
          key={option.id}
          ref={(el) => {
            if (el) buttonRefs.current.set(option.id, el);
          }}
          onClick={() => onChange(option.id)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-full transition-colors duration-300",
            hasLabels
              ? cn("px-3 py-1.5", size === "md" ? "px-4 py-2" : "")
              : cn(size === "sm" ? "w-8 h-8" : "w-9 h-9"),
            value === option.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon}
          {option.label && <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}>{option.label}</span>}
        </button>
      ))}
    </div>
  );
}
