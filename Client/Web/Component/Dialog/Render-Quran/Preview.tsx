// @Web/Component/Dialog/Render-Surah-Preview.tsx
import React, { useMemo, useEffect } from "react";
import { Button } from "@Web/Component/UI/Button";
import { cn } from "@/Library/utils";
import { Minimize2, Maximize2, Copy } from "lucide-react";
import { toast } from "@/Hook/Use-Toast";
import { type Config, buildEmbedPreviewDoc } from "./Types";

interface PreviewProps {
  mode: "render" | "embed";
  cfg: Config;
  ecfg: Config & Record<string, any>;
  verses: any[];
  currentVerseIdx: number;
  previewWrapRef: React.RefObject<HTMLDivElement | null>;
  previewAR: number;
  fullscreen: boolean;
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  embedSnippet: string;
  introVisible: boolean;
  outroVisible: boolean;
  colors: {
    arabicCol: string;
    translationCol: string;
    transliterationCol: string;
    highlightCol: string;
  };
  pageFontFamily: (font: string, surahId: number, verseNumber: number) => string;
  fontClass: (font: string) => string;
  posClasses: (pos: string) => string;
  cornerCls: Record<string, string>;
  ourLogoCorner: string;
}

export function RenderSurahPreview({
  mode, cfg, ecfg, verses, currentVerseIdx, previewWrapRef, previewAR,
  fullscreen, setFullscreen, embedSnippet, introVisible, outroVisible,
  colors, pageFontFamily, fontClass, posClasses, cornerCls, ourLogoCorner
}: PreviewProps) {
  const { arabicCol, translationCol, transliterationCol, highlightCol } = colors;

  // Global UI listener to toggle layout shell header when fullscreen switches
  useEffect(() => {
    if (fullscreen) {
      window.dispatchEvent(new Event("hide-header"));
    } else {
      window.dispatchEvent(new Event("show-header"));
    }

    // Safety unmount switch logic
    return () => {
      window.dispatchEvent(new Event("show-header"));
    };
  }, [fullscreen]);

  // Compute dynamic collision safe layout positions for the watermark
  const watermarkPlacementClass = useMemo(() => {
    const hasLogoAtTopRight = cfg.logoUrl && cfg.logoCorner === "tr";
    const computedCornerKey = hasLogoAtTopRight ? "tl" : "tr";
    return cornerCls[computedCornerKey];
  }, [cfg.logoUrl, cfg.logoCorner, cornerCls]);

  return (
    <div className={cn("space-y-3", fullscreen ? "space-y-0" : "")}>
      <div className={cn("w-full", fullscreen ? "h-screen w-screen fixed inset-0 z-50 bg-black" : "")}>
        <div
          ref={previewWrapRef}
          className={cn(
            "relative overflow-hidden transition-all duration-150",
            fullscreen 
              ? "w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none z-50" 
              : "w-full mx-auto shadow-xl"
          )}
          style={{
            aspectRatio: fullscreen ? undefined : previewAR,
            maxWidth: fullscreen ? "100vw" : (previewAR >= 1 ? "100%" : "min(70vh, 100%)"),
            borderRadius: fullscreen ? "0px" : cfg.borderRadius,
            height: fullscreen ? "100vh" : undefined,
          }}
        >
          {mode === "embed" ? (
            <iframe
              title="Embed preview"
              srcDoc={buildEmbedPreviewDoc(
                ecfg as unknown as Config,
                verses,
                { arabicCol, translationCol, transliterationCol, highlightCol },
                ecfg.extraTranslations || {},
                ecfg.extraTransliterations || {}
              )}
              className="absolute inset-0 w-full h-full bg-white"
            />
          ) : (
            <>
              {/* Background Layers */}
              {cfg.bgKind === "video" && cfg.bgUrl ? (
                <video src={cfg.bgUrl} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover" />
              ) : cfg.bgKind === "image" && cfg.bgUrl ? (
                <img src={cfg.bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: cfg.bgColor }} />
              )}

              {/* Uploaded Logo Image Anchor */}
              {cfg.logoUrl && (
                <img src={cfg.logoUrl} alt="logo"
                  className={cn("absolute h-10 w-auto object-contain z-10", cornerCls[cfg.logoCorner])} />
              )}

              {introVisible && cfg.introUrl && (
                <video src={cfg.introUrl} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
              )}
              {outroVisible && cfg.outroUrl && (
                <video src={cfg.outroUrl} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
              )}

              {!introVisible && !outroVisible && (() => {
                const v = verses[currentVerseIdx];
                if (!v) return null;
                
                const currentWordIdx = 0; 
                const activeTranslations = ecfg.translations.filter((t) => t !== "None");
                const activeTransliterations = ecfg.transliterations.filter((t) => t !== "None");
                const ff = pageFontFamily(ecfg.font, cfg.surahId, v.verseNumber);

                return (
                  <>
                    {/* Arabic Text Block */}
                    <div className={cn("absolute inset-0 flex p-6 pointer-events-none", posClasses(cfg.arabicPosition))}>
                      <div dir="rtl"
                        className={cn("max-w-[90%] leading-relaxed", fontClass(ecfg.font))}
                        style={{ color: arabicCol, fontSize: ecfg.arabicSize, fontFamily: ff }}>
                        {v.words.map((w: string, i: number) => (
                          <span key={i} style={i === currentWordIdx ? { color: highlightCol } : undefined}>
                            {w}{ecfg.font === "uthmani_v1" ? "" : " "}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Transliteration Block */}
                    {activeTransliterations.length > 0 && (
                      <div className={cn("absolute inset-0 flex p-6 pointer-events-none", posClasses(cfg.transliterationPosition))}>
                        <div className="max-w-[90%]">
                          {activeTransliterations.map((src) => (
                            <div key={src} className="italic" style={{ color: transliterationCol, fontSize: ecfg.transliterationSize }}>
                              {ecfg.extraTransliterations?.[src]?.[v.verseNumber - 1] ?? ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Translation Block */}
                    {activeTranslations.length > 0 && (
                      <div className={cn("absolute inset-0 flex p-6 pointer-events-none", posClasses(cfg.translationPosition))}>
                        <div className="max-w-[90%]">
                          {activeTranslations.map((src) => (
                            <div key={src} style={{ color: translationCol, fontSize: ecfg.translationSize }}>
                              {ecfg.extraTranslations?.[src]?.[v.verseNumber - 1] ?? ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Composition Guidelines */}
              {cfg.showLines && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-6 py-8">
                  {Array.from({ length: Math.max(2, cfg.linesCount) }).map((_, i) => (
                    <div key={i} className="h-px bg-white/20" />
                  ))}
                </div>
              )}

              {/* Watermark Element Layer */}
              {cfg.showWatermark && cfg.watermarkText && (
                <div className={cn("absolute text-[10px] sm:text-xs font-semibold text-white/85 pointer-events-none p-3 z-10", watermarkPlacementClass)}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                  {cfg.watermarkText}
                </div>
              )}
            </>
          )}

          {/* Canvas Fullscreen Action Control Trigger */}
          {mode === "render" && (
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="absolute bottom-3 right-3 z-20 inline-flex items-center justify-center h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {mode === "embed" && (
        <Box>
          <div className="flex items-center justify-between mb-2">
            <SectionTitle>Embed Snippet</SectionTitle>
            <Button size="sm" variant="outline" className="gap-1"
              onClick={() => { navigator.clipboard?.writeText(embedSnippet); toast({ title: "Copied" }); }}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
          <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto whitespace-pre-wrap break-all">
            {embedSnippet}
          </pre>
        </Box>
      )}
    </div>
  );
}

function Box({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/40 p-3", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{children}</div>;
}