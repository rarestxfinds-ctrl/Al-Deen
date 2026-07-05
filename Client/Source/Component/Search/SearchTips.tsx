// @/Component/Search/SearchTips.tsx
// Help panel showing advanced search syntax, sunnah.com style.
import { Container } from "@/Component/UI/Container";

const tips: { syntax: string; example: string; desc: string }[] = [
  { syntax: '"…"', example: '"pledge allegiance"', desc: "Exact phrase" },
  { syntax: "?", example: "nea?", desc: "Single-character wildcard" },
  { syntax: "*", example: "test*", desc: "Multi-character wildcard" },
  { syntax: "~", example: "swore~", desc: "Fuzzy (typo-tolerant)" },
  { syntax: '"…"~N', example: '"pledge migration"~10', desc: "Proximity" },
  { syntax: "^N", example: "pledge^4", desc: "Boost a term" },
  { syntax: "( )", example: "(pledge OR allegiance) AND prayer", desc: "Group / boolean" },
  { syntax: "AND", example: "fasting AND ramadan", desc: "Both terms" },
  { syntax: "OR", example: "salah OR prayer", desc: "Either (default)" },
  { syntax: "+", example: "+required word", desc: "Required term" },
  { syntax: "NOT / -", example: "prayer -night", desc: "Exclude term" },
];

export function SearchTips() {
  return (
    <div className="p-2">
      <Container className="!py-3 !px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Search tips
        </p>
        <ul className="space-y-1.5">
          {tips.map((t) => (
            <li
              key={t.syntax + t.example}
              className="grid grid-cols-[64px_1fr] gap-2 items-start text-xs"
            >
              <code className="font-mono text-[11px] bg-muted/50 rounded px-1.5 py-0.5 text-center">
                {t.syntax}
              </code>
              <div className="min-w-0">
                <div className="font-medium truncate">{t.desc}</div>
                <code className="font-mono text-[10.5px] text-muted-foreground truncate block">
                  {t.example}
                </code>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
