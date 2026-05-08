import { useState } from "react";
import { Minus, Plus, Check, ChevronDown, ArrowLeft } from "lucide-react";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/Top/Component/UI/tooltip";
import { cn } from "@/Middle/Library/utils";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/Top/Component/UI/Dropdown-Menu";
import type { PreviewWordProps, SelectorBarProps, SizeControlProps } from "./Types";

// ============= Helper Functions =============

export const getFontClass = (quranFont: string) => {
  switch (quranFont) {
    case "indopak":    return "font-indopak";
    case "uthmani_v1": return "font-uthmani_v1";
    case "uthmani_v2": return "font-uthmani_v2";
    case "uthmani_v4": return "font-uthmani_v4";
    default:           return "font-uthmani";
  }
};

export const getPreviewFontSize = (fontSize: number) => `${(1.5 * fontSize) / 5}rem`;

// ============= Mobile Navigator Component =============

interface MobileNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  children?: React.ReactNode;
}

export function MobileNavigator({
  isOpen,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  children,
}: MobileNavigatorProps) {
  if (!isOpen) return null;

  const OptionList = () => (
    <div className="space-y-1">
      {options.map((option) => (
        <Button
          key={option.id}
          onClick={() => {
            onSelect(option.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-4 py-3 h-auto group"
          variant="secondary"
          fullWidth
        >
          <span className="text-sm text-foreground group-hover:text-white dark:group-hover:text-black">
            {option.label}
          </span>
          {selectedId === option.id && (
            <Check className="h-4 w-4 text-primary group-hover:text-white dark:group-hover:text-black" />
          )}
        </Button>
      ))}
    </div>
  );

  // Only the content – top bar is managed externally (via store)
  return (
    <div>
      {children || <OptionList />}
    </div>
  );
}

// ============= Reusable Components =============

export function SelectorBar<T extends string>({
  label, value, options, onSelect,
}: SelectorBarProps<T>) {
  const currentLabel = options.find(o => o.id === value)?.label || options[0].label;
  return (
    <Container className="!py-2.5 !px-3 flex items-center justify-between">
      <span className="font-medium text-sm text-foreground group-hover:text-white dark:group-hover:text-black">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 px-2.5 py-1 h-auto text-xs font-medium"
          >
            {currentLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{opt.label}</span>
              {value === opt.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Container>
  );
}

export function PreviewWord({
  arabic, translation,
  showTranslation, showTooltip, showInline,
  recitationEnabled, fontClass, fontSize,
}: PreviewWordProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = () => {
    if (!recitationEnabled) return;
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 600);
  };

  return (
    <div className="flex flex-col items-center group">
      <TooltipProvider>
        <Tooltip open={isHovered && showTooltip && showTranslation}>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "transition-all duration-200 cursor-pointer relative",
                fontClass,
                isHovered && !isPlaying ? "text-primary scale-105" : "",
                isPlaying ? "text-primary" : "text-foreground group-hover:text-white dark:group-hover:text-black"
              )}
              style={{ fontSize }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleClick}
            >
              <span>{arabic}</span>
              {isPlaying && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary word-playing" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-white dark:bg-black border-2 border-black dark:border-white rounded-[40px]">
            {showTranslation && <p className="text-sm font-medium text-center">{translation}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {showInline && showTranslation && (
        <p className="text-[10px] text-muted-foreground group-hover:text-white/70 dark:group-hover:text-black/70 mt-1">{translation}</p>
      )}
    </div>
  );
}

export function SizeControl({ value, onIncrease, onDecrease, min = 1, max = 10 }: SizeControlProps) {
  return (
    <Container className="!py-2.5 !px-3 flex items-center justify-between">
      <span className="text-sm text-foreground group-hover:text-white dark:group-hover:text-black">Size</span>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="w-8 h-8 p-0 rounded-full"
          onClick={onDecrease}
          disabled={value <= min}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center font-semibold text-sm text-foreground group-hover:text-white dark:group-hover:text-black">{value}</span>
        <Button
          size="sm"
          className="w-8 h-8 p-0 rounded-full"
          onClick={onIncrease}
          disabled={value >= max}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Container>
  );
}