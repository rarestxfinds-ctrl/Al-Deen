// Component/UI/Input.tsx
import * as React from "react";
import { cn } from "@/Library/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full px-4 py-2 text-base rounded-[40px] transition-colors",
          // SOFT defaults
          "bg-card text-foreground border border-border/30",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-border/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // HIGH-CONTRAST override
          "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black",
          "[.high-contrast_&]:text-black [.high-contrast_&]:dark:text-white",
          "[.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
          "[.high-contrast_&]:focus:ring-0 [.high-contrast_&]:focus:border-black [.high-contrast_&]:dark:focus:border-white",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
