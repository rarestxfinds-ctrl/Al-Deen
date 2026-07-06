interface ProgressBarProps {
  progress: number;
  className?: string;
}

// Loading UI globally disabled — progress bars no longer render.
export function ProgressBar(_: ProgressBarProps) {
  return null;
}