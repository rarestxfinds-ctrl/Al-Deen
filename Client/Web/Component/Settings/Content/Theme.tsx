import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "@Web/Component/UI/Button";
import { Container } from "@Web/Component/UI/Container";
import { useApp } from "@Web/Context/App";
import { cn } from "@/Library/utils";

const THEMES = [
  { id: "light", label: "Light", description: "Bright, clean interface", icon: Sun },
  { id: "dark",  label: "Dark",  description: "Easier on the eyes at night", icon: Moon },
  { id: "auto",  label: "System", description: "Match your device setting", icon: Monitor },
] as const;

export function ThemeSection() {
  const { theme, setTheme } = useApp();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Theme</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose how the app looks. System follows your device preference.
        </p>
      </div>

      <div className="space-y-2">
        {THEMES.map((t) => {
          const Icon = t.icon;
          const isSelected = theme === t.id;
          return (
            <Container
              key={t.id}
              className={cn(
                "!p-0 overflow-hidden",
                isSelected && "border-primary/60"
              )}
            >
              <Button
                onClick={() => setTheme(t.id as "light" | "dark" | "auto")}
                className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4"
                variant="secondary"
                fullWidth
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </Button>
            </Container>
          );
        })}
      </div>
    </div>
  );
}
