import { Contrast, Volume2, Link2, ZoomIn, Sparkles, Minus, Plus } from "lucide-react";
import { Container } from "@Web/Component/UI/Container";
import { Switch } from "@Web/Component/UI/Switch";
import { Button } from "@Web/Component/UI/Button";
import { useApp } from "@Web/Context/App";

interface RowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Row({ icon: Icon, title, description, children }: RowProps) {
  return (
    <Container className="!p-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 py-3 px-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center">{children}</div>
      </div>
    </Container>
  );
}

export function AccessibilitySection() {
  const {
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    underlineLinks, setUnderlineLinks,
    screenReaderHints, setScreenReaderHints,
    uiTextScale, setUiTextScale,
  } = useApp();

  const clampScale = (v: number) => Math.max(0.85, Math.min(1.5, Math.round(v * 100) / 100));
  const pct = Math.round(uiTextScale * 100);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Accessibility</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust the interface to be easier to see, hear, and navigate.
        </p>
      </div>

      <Row
        icon={Contrast}
        title="High Contrast"
        description="Bold borders and stronger separation between elements."
      >
        <Switch
          checked={highContrast}
          onCheckedChange={setHighContrast}
          aria-label="Toggle high contrast"
        />
      </Row>

      <Row
        icon={Volume2}
        title="Screen Reader Hints"
        description="Add extra spoken descriptions for actions and controls."
      >
        <Switch
          checked={screenReaderHints}
          onCheckedChange={setScreenReaderHints}
          aria-label="Toggle screen reader hints"
        />
      </Row>

      <Row
        icon={Sparkles}
        title="Reduce Motion"
        description="Minimize animations, transitions and parallax effects."
      >
        <Switch
          checked={reduceMotion}
          onCheckedChange={setReduceMotion}
          aria-label="Toggle reduce motion"
        />
      </Row>

      <Row
        icon={Link2}
        title="Underline Links"
        description="Always show underlines so links are easier to spot."
      >
        <Switch
          checked={underlineLinks}
          onCheckedChange={setUnderlineLinks}
          aria-label="Toggle underline links"
        />
      </Row>

      <Container className="!p-0 overflow-hidden">
        <div className="flex items-start justify-between gap-3 py-3 px-4">
          <div className="flex items-start gap-3 min-w-0">
            <ZoomIn className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Text Size</p>
              <p className="text-xs text-muted-foreground">
                Scale interface text. Current: {pct}%
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              size="icon"
              onClick={() => setUiTextScale(clampScale(uiTextScale - 0.05))}
              aria-label="Decrease text size"
              disabled={uiTextScale <= 0.85}
              className="!h-8 !w-8 !p-0"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => setUiTextScale(1)}
              aria-label="Reset text size"
              className="!px-3"
            >
              Reset
            </Button>
            <Button
              size="icon"
              onClick={() => setUiTextScale(clampScale(uiTextScale + 0.05))}
              aria-label="Increase text size"
              disabled={uiTextScale >= 1.5}
              className="!h-8 !w-8 !p-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
