import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/Library/utils";

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
}

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ children, variant = "secondary", size = "md", className, fullWidth, ...props }, ref) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(
        "relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200",
        "inline-flex items-center justify-center gap-2",
        sizeClasses[size],
        fullWidth && "w-full",
        variant === "primary" && "text-primary",
        // Hover for non-active state: black background, white text/icon
        "hover:bg-black dark:hover:bg-white",
        "hover:border-white dark:hover:border-black",
        "hover:text-white dark:hover:text-black",
        "hover:[&_svg]:text-white dark:hover:[&_svg]:text-black",
        // Active state: black background, white text/icon
        "data-[state=on]:bg-black dark:data-[state=on]:bg-white",
        "data-[state=on]:text-white dark:data-[state=on]:text-black",
        "data-[state=on]:border-white dark:data-[state=on]:border-black",
        "data-[state=on]:[&_svg]:text-white dark:data-[state=on]:[&_svg]:text-black",
        // Hover for active state: invert to white background, black text/icon
        "data-[state=on]:hover:bg-white dark:data-[state=on]:hover:bg-black",
        "data-[state=on]:hover:text-black dark:data-[state=on]:hover:text-white",
        "data-[state=on]:hover:border-black dark:data-[state=on]:hover:border-white",
        "data-[state=on]:hover:[&_svg]:text-black dark:data-[state=on]:hover:[&_svg]:text-white",
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive.Root>
  );
});

Toggle.displayName = "Toggle";

export { Toggle };