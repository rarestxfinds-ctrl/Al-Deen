import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/Library/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState<number[]>(
    value || defaultValue || [0]
  );
  
  const currentValue = value || internalValue;
  const percentage = ((currentValue[0] - min) / (max - min)) * 100;

  return (
    <div className="relative w-full h-6 flex items-center">
      {/* Visual track with borders */}
      <div className="relative h-2.5 w-full rounded-full">
        {/* Left section (filled) - Black with WHITE border */}
        <div 
          className="absolute left-0 top-0 h-full bg-black dark:bg-white rounded-l-full border-y border-l border-white dark:border-black"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Right section (empty) - White with BLACK border */}
        <div 
          className="absolute right-0 top-0 h-full bg-white dark:bg-black rounded-r-full border-y border-r border-black dark:border-white"
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
      
      {/* Radix Slider (invisible, handles interaction) */}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "absolute top-0 left-0 w-full h-full touch-none select-none",
          className
        )}
        value={currentValue}
        onValueChange={(val) => {
          setInternalValue(val);
          onValueChange?.(val);
        }}
        min={min}
        max={max}
        step={step}
        {...props}
      >
        <SliderPrimitive.Track className="h-full w-full opacity-0">
          <SliderPrimitive.Range />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-6 w-6 rounded-full bg-white dark:bg-black border border-black dark:border-white",
            "transition-all duration-200 cursor-pointer",
            "hover:bg-black dark:hover:bg-white hover:border-white dark:hover:border-black",
            "relative z-10"
          )}
        />
      </SliderPrimitive.Root>
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };