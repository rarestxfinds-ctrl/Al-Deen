import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@Web/Component/UI/Input";
import { Button } from "@Web/Component/UI/Button";
import { Container } from "@Web/Component/UI/Container";
import { useApp } from "@Web/Context/App";
import { useTranslation } from "@/Hook/Use-Translation";
import { cn } from "@/Library/utils";
import { languages } from "../Constants";

interface LanguageSectionProps {
  onSelect: () => void;
}

export function LanguageSection({ onSelect }: LanguageSectionProps) {
  const { t } = useTranslation();
  const { currentLanguage, setCurrentLanguage } = useApp();
  const [search, setSearch] = useState("");

  const filtered = languages.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (code: string) => {
    setCurrentLanguage(code);
    onSelect();
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.settings.searchLanguages}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-muted/30 border-2 border-black dark:border-white rounded-[40px] focus:border-primary transition-colors"
        />
      </div>

      {/* Language List */}
      <div className="space-y-2">
        {filtered.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <Container
              key={lang.code}
              className={cn(
                "!p-0 overflow-hidden transition-all group",
                isSelected && "border-primary/50 bg-primary/5"
              )}
            >
              <Button
                onClick={() => handleSelect(lang.code)}
                className="w-full flex items-center justify-between px-4 py-3 h-auto"
                variant="secondary"
                fullWidth
              >
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                    {lang.name}
                  </p>
                  <p className="text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white/70 [.high-contrast_&]:dark:group-hover:text-black/70">
                    {lang.nativeName}
                  </p>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
                )}
              </Button>
            </Container>
          );
        })}
      </div>
    </div>
  );
}