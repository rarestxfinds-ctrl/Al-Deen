import { cn } from "@/Middle/Library/utils";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn(
      "relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200",
      "w-full max-w-none px-2 py-2",
      className
    )}>
      {children}
    </div>
  );
}