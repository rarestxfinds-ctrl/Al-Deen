import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/Library/utils";
import { Button } from "./Button";
import { Card } from "./Card";

interface DropdownProps<T> {
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  renderOption?: (option: { value: T; label: string }) => ReactNode;
  className?: string;
}

export function Dropdown<T>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  renderOption,
  className,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
        fullWidth
      >
        {displayText}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto z-[100]">
          <Card className="p-1" hoverable={false}>
            {options.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                  "text-black dark:text-white",
                  value === option.value
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                )}
              >
                {renderOption ? renderOption(option) : option.label}
              </button>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}