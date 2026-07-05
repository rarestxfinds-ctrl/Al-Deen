import { cn } from "@/Library/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={cn(
      "relative h-1.5 sm:h-2 rounded-full overflow-hidden bg-muted",
      className
    )}>
      <div
        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}