import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/Library/utils";
import { Container } from "@Web/Component/UI/Container";

const alertVariants = cva(
  "relative w-full [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <Container
    ref={ref}
    role="alert"
    className={cn(
      alertVariants({ variant }),
      "!py-4 !px-5 group",
      variant === "destructive" && "border-destructive/50",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(
        "mb-1 font-medium leading-none tracking-tight text-foreground",
        "[.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black",
        className
      )}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground [&_p]:leading-relaxed",
        "[.high-contrast_&]:group-hover:text-white/70 [.high-contrast_&]:dark:group-hover:text-black/70",
        className
      )}
      {...props}
    />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };