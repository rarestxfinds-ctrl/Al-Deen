import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/Library/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  size?: "sm" | "md" | "lg";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: {
      root: "w-9 h-5",
      thumb: "w-3 h-3 left-[3px] data-[state=checked]:left-[auto] data-[state=checked]:right-[3px] data-[state=checked]:translate-x-0",
    },
    md: {
      root: "w-11 h-6",
      thumb: "w-4 h-4 left-[4px] data-[state=checked]:left-[auto] data-[state=checked]:right-[4px] data-[state=checked]:translate-x-0",
    },
    lg: {
      root: "w-14 h-7",
      thumb: "w-5 h-5 left-[5px] data-[state=checked]:left-[auto] data-[state=checked]:right-[5px] data-[state=checked]:translate-x-0",
    },
  };

  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full transition-all duration-200 group/switch",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // SOFT defaults
        "bg-muted border border-border/40",
        "hover:bg-muted/70",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
        // HIGH-CONTRAST override
        "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black",
        "[.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
        "[.high-contrast_&]:hover:bg-black [.high-contrast_&]:dark:hover:bg-white",
        "[.high-contrast_&]:hover:border-white [.high-contrast_&]:dark:hover:border-black",
        "[.high-contrast_&]:data-[state=checked]:bg-black [.high-contrast_&]:dark:data-[state=checked]:bg-white",
        "[.high-contrast_&]:data-[state=checked]:border-white [.high-contrast_&]:dark:data-[state=checked]:border-black",
        "[.high-contrast_&]:data-[state=checked]:hover:bg-white [.high-contrast_&]:dark:data-[state=checked]:hover:bg-black",
        "[.high-contrast_&]:data-[state=checked]:hover:border-black [.high-contrast_&]:dark:data-[state=checked]:hover:border-white",
        sizeClasses[size].root,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full transition-all duration-200 absolute top-1/2 -translate-y-1/2",
          // SOFT defaults
          "bg-card border border-border/40",
          "data-[state=checked]:bg-primary-foreground data-[state=checked]:border-transparent",
          // HIGH-CONTRAST override
          "[.high-contrast_&]:bg-black [.high-contrast_&]:dark:bg-white [.high-contrast_&]:border-0",
          "[.high-contrast_&]:group-hover/switch:bg-white [.high-contrast_&]:dark:group-hover/switch:bg-black",
          "[.high-contrast_&]:data-[state=checked]:bg-white [.high-contrast_&]:dark:data-[state=checked]:bg-black",
          "[.high-contrast_&]:data-[state=checked]:group-hover/switch:bg-black [.high-contrast_&]:dark:data-[state=checked]:group-hover/switch:bg-white",
          sizeClasses[size].thumb
        )}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = "Switch";

export { Switch };
