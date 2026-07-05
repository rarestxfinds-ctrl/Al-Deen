// @/Component/UI/Button.tsx
import { cn } from "@/Library/utils";
import { ReactNode, HTMLAttributes, forwardRef } from "react";

// Add the variants configuration
export const buttonVariants = {
  variants: {
    default: "",
    destructive: "",
    outline: "",
    secondary: "",
    ghost: "",
    link: "",
  },
  sizes: {
    default: "h-10 px-5 py-2",
    sm: "h-8 px-4 text-xs",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10",
  },
};

// Use HTMLAttributes instead of ButtonHTMLAttributes to support safe polymorphic 'div' properties safely
interface ButtonProps extends HTMLAttributes<HTMLButtonElement | HTMLDivElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "default" | "icon";
  className?: string;
  active?: boolean;
  fullWidth?: boolean;
  as?: "button" | "div"; // Allows you to explicitly switch the underlying element context
  type?: "button" | "submit" | "reset"; // Safely preserved if element renders as a button
}

export const Button = forwardRef<HTMLButtonElement | HTMLDivElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      className,
      active,
      fullWidth,
      as = "button",
      type = "button",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      default: "px-4 py-2 text-sm",
      icon: "p-2",
    };

    // Dynamically choose element type based on the 'as' configuration property
    const Component = as;

    // Conditionally attach button-specific attributes only if rendering a real native button
    const componentProps = as === "button" ? { type, ...props } : props;

    return (
      <Component
        ref={ref as any}
        className={cn(
          // SOFT default (design-token based)
          "relative rounded-[40px] bg-card text-card-foreground border border-border/30 transition-all duration-200",
          "inline-flex items-center justify-center gap-2",
          "hover:bg-accent hover:text-accent-foreground",
          as === "div" ? "cursor-pointer select-none" : "", // Adds seamless interactive feels when rendered as a layout div shell
          sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
          fullWidth && "w-full",
          variant === "primary" && "text-primary",
                    
          // HIGH-CONTRAST override (brutalist look) — only when .high-contrast on <html>
          "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black",
          "[.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
          "[.high-contrast_&]:hover:bg-black [.high-contrast_&]:dark:hover:bg-white",
          "[.high-contrast_&]:hover:text-white [.high-contrast_&]:dark:hover:text-black",
          "[.high-contrast_&]:hover:border-white [.high-contrast_&]:dark:hover:border-black",
          
          // Active state: keep readable contrast (text stays its theme color), invert bg/border to match.
          active && "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black [.high-contrast_&]:text-black [.high-contrast_&]:dark:text-white [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white [.high-contrast_&]:border-4 [.high-contrast_&]:ring-2 [.high-contrast_&]:ring-black [.high-contrast_&]:dark:ring-white",
          className
        )}
        {...componentProps}
      >
        {children}
      </Component>
    );
  }
);

Button.displayName = "Button";