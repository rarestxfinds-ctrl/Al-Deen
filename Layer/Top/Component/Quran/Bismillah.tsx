import { useApp } from "@/Middle/Context/App";
import { WordTooltip, useAudioPlayback } from "@/Top/Component/Quran/Layout/Safhah/Utility";
import type { BismillahWord } from "./Types";

interface BismillahProps {
  words: BismillahWord[];
  fontClass: string;
  fontSize: string;
  fontFamily?: string;               // optional override (e.g., "Uthmani-V2-1")
  wordSpacing?: string;
  showInlineTranslation?: boolean;
  showInlineTransliteration?: boolean;
  hoverTranslationEnabled?: boolean;
  inlineTranslationSize?: number;
  inlineTransliterationSize?: number;
}

export function Bismillah({
  words,
  fontClass,
  fontSize,
  fontFamily,
  wordSpacing = "1.8px",
  showInlineTranslation = false,
  showInlineTransliteration = false,
  hoverTranslationEnabled = false,
  inlineTranslationSize = 12,
  inlineTransliterationSize = 12,
}: BismillahProps) {
  const { hoverRecitation } = useApp();
  const { playWordAudio, isPlaying } = useAudioPlayback(1); // surah 1 for word audio

  const LATIN_FONT_STYLE = {
    fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
    fontFeatureSettings: "normal",
    fontVariant: "normal",
    fontWeight: 400,
  };

  return (
    <div
      className={fontClass}
      style={{ fontSize, lineHeight: 1.8, wordSpacing, fontFamily }}
      dir="rtl"
    >
      <div className="flex justify-center items-start flex-wrap gap-x-0" dir="rtl">
        {words.map((word, idx) => {
          const wordKey = `bismillah-${idx}`;
          const handleClick = () => {
            if (hoverRecitation) {
              // Word audio for surah 1, verse 1, word idx+1 (if available)
              playWordAudio(1, idx);
            }
          };

          return (
            <div key={idx} className="flex flex-col items-center">
              <WordTooltip
                translation={hoverTranslationEnabled ? word.translation : undefined}
                transliteration={hoverTranslationEnabled ? word.transliteration : undefined}
                enabled={hoverTranslationEnabled}
                onClick={handleClick}
              >
                <span
                  className="select-text transition-colors duration-200 inline text-foreground hover:text-primary cursor-pointer"
                  onClick={handleClick}
                >
                  {word.glyph}{" "}
                </span>
              </WordTooltip>

              {(showInlineTranslation || showInlineTransliteration) && (
                <div
                  className="flex flex-col items-center gap-y-0.5 mt-1 w-full"
                  dir="ltr"
                  style={LATIN_FONT_STYLE}
                >
                  {showInlineTranslation && (
                    <span
                      className="text-black dark:text-white text-center leading-tight block w-full"
                      style={{ fontSize: inlineTranslationSize }}
                    >
                      {word.translation}
                    </span>
                  )}
                  {showInlineTransliteration && (
                    <span
                      className="text-gray-500 dark:text-gray-400 text-center leading-tight block w-full"
                      style={{ fontSize: inlineTransliterationSize }}
                    >
                      {word.transliteration}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}