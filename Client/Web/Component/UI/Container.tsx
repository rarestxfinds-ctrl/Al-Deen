import { cn } from "@/Library/utils";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn(
      // Soft default (uses design tokens)
      "relative rounded-[40px] bg-card text-card-foreground border border-border/30 transition-all duration-200",
      "w-full max-w-none px-2 py-2",
      // High-contrast override (brutalist look) — only when .high-contrast is on <html>
      "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black [.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
      className
    )}>
      {children}
    </div>
  );
}
