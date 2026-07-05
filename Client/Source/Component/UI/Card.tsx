import { cn } from "@/Library/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, active, hoverable = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-[40px] transition-all duration-200",
        // SOFT defaults
        "bg-card text-card-foreground border border-border/30",
        hoverable && "group hover:bg-accent hover:border-border/50",
        active && "bg-accent border-border/60",
        // HIGH-CONTRAST override
        "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black",
        "[.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
        "[.high-contrast_&]:text-black [.high-contrast_&]:dark:text-white",
        hoverable && "[.high-contrast_&]:hover:bg-black [.high-contrast_&]:dark:hover:bg-white",
        hoverable && "[.high-contrast_&]:hover:border-white [.high-contrast_&]:dark:hover:border-black",
        hoverable && "[.high-contrast_&]:hover:text-white [.high-contrast_&]:dark:hover:text-black",
        active && "[.high-contrast_&]:bg-black [.high-contrast_&]:dark:bg-white",
        active && "[.high-contrast_&]:border-white [.high-contrast_&]:dark:border-black",
        active && "[.high-contrast_&]:text-white [.high-contrast_&]:dark:text-black",
        className
      )}
    >
      {children}
    </div>
  );
}
