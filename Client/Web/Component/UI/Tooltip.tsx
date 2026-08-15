// @Web/Component/UI/Tooltip.tsx
// Lightweight portal-based tooltip with the new design system:
// uses semantic tokens, soft shadow, subtle border, with a high-contrast
// override for brutalist mode.
import { cn } from "@/Library/utils";
import { ReactNode, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  enabled?: boolean;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  offset?: number;
}

export function Tooltip({
  children,
  content,
  enabled = true,
  className,
  side = "top",
  offset = 10,
}: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = 0;
    let y = 0;
    switch (side) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - offset;
        break;
      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + offset;
        break;
      case "left":
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
    }
    setPos({ x, y });
  };

  useEffect(() => {
    if (!show) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [show, side]);

  if (!enabled || !content) return <>{children}</>;

  const trigger = (
    <span
      ref={triggerRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => {
        setShow(false);
        setPos(null);
      }}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      style={{ display: "inline" }}
    >
      {children}
    </span>
  );

  const body =
    show && pos &&
    createPortal(
      <div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          transform:
            side === "top" || side === "bottom"
              ? "translateX(-50%)"
              : "translateY(-50%)",
          zIndex: 9999,
          pointerEvents: "none",
          maxWidth: 280,
        }}
        className="animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div
          className={cn(
            "px-3 py-1.5 text-xs font-medium text-center rounded-full",
            "bg-card text-card-foreground border border-border/40 shadow-md backdrop-blur-sm",
            "[.high-contrast_&]:bg-white [.high-contrast_&]:dark:bg-black",
            "[.high-contrast_&]:text-black [.high-contrast_&]:dark:text-white",
            "[.high-contrast_&]:border-2 [.high-contrast_&]:border-black [.high-contrast_&]:dark:border-white",
            className
          )}
        >
          {content}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {trigger}
      {body}
    </>
  );
}
