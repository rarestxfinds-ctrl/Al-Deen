// Client/Component/Dialog/Render-Surah-Dialog.tsx
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { RenderSurahPreview } from "./Preview";
import { RenderSurahSidebar } from "./Sidebar";
import { type Props, type Config, RESOLUTIONS, ensureReadable, fontClass, posClasses } from "./Types";
import { useRenderSurahState } from "./State";
import { processVideoRender } from "./Processor";
import { surahList } from "Server/API/Quran";
import { useBackHandler } from "Client/Hook/Use-Back-Handler";
import { useApp } from "Client/Context/App";
import { toast } from "Client/Hook/Use-Toast";
import { cn } from "Client/Library/utils";

export function RenderSurahDialog({ open, onOpenChange, surahId, ayahNumber, mode = "render" }: Props) {
  useBackHandler(open, () => onOpenChange(false));
  const app = useApp();
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const { cfg, setCfg, ecfg, surahData, extraTranslations, extraTransliterations } = 
    useRenderSurahState(surahId, ayahNumber, mode, app, open);

  const [fullscreen, setFullscreen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");
  const [resultSize, setResultSize] = useState(0);

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  // Prevent background body scroll chaining on desktop & mobile touch-drag interfaces
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  const verses = useMemo(() => 
    (surahData?.verses ?? []).filter((v) => v.verseNumber >= cfg.ayahStart && v.verseNumber <= cfg.ayahEnd),
    [surahData, cfg.ayahStart, cfg.ayahEnd]
  );

  const containerBgColorForContrast = cfg.containerBgKind === "color" ? cfg.containerBg : cfg.bgColor;
  const colors = useMemo(() => ({
    arabicCol: cfg.autoContrast ? ensureReadable(cfg.arabicColor, containerBgColorForContrast) : cfg.arabicColor,
    translationCol: cfg.autoContrast ? ensureReadable(cfg.translationColor, containerBgColorForContrast) : cfg.translationColor,
    transliterationCol: cfg.autoContrast ? ensureReadable(cfg.transliterationColor, containerBgColorForContrast) : cfg.transliterationColor,
    highlightCol: cfg.autoContrast ? ensureReadable(cfg.highlightColor, containerBgColorForContrast) : cfg.highlightColor,
  }), [cfg, containerBgColorForContrast]);

  const previewSize = useMemo(() => mode === "embed" ? { w: cfg.width, h: cfg.height } : { w: RESOLUTIONS[cfg.resolution].w, h: RESOLUTIONS[cfg.resolution].h }, [mode, cfg]);
  const previewAR = previewSize.w / previewSize.h;
  const embedSnippet = useMemo(() => { return `<iframe>...</iframe>` }, [cfg, ecfg]);

  const onFile = (field: "bgUrl" | "logoUrl" | "containerBgUrl", kindField?: "image" | "video") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCfg((c) => ({ ...c, [field]: URL.createObjectURL(f), ...(kindField && field === "bgUrl" ? { bgKind: kindField } : {}) }));
  };

  const handleRender = useCallback(async () => {
  if (rendering) return;
  if (!surahData || verses.length === 0) return toast({ title: "Content loading" });

  cancelRef.current = false; setRendering(true); setProgress(0);

  try {
    const result = await processVideoRender({ cfg, ecfg, verses, extraTranslations, extraTransliterations, previewSize, colors, setProgress, shouldCancel: () => cancelRef.current });
    setResultUrl(result.url);      // remote URL now, not an object URL
    setResultExt(result.ext);
    setResultSize(result.size);

    const a = document.createElement("a");
    a.href = result.url; a.download = `Surah-${cfg.surahId}.${result.ext}`;
    document.body.appendChild(a); a.click(); a.remove();
  } catch (err) {
    toast({ title: "Render failed", variant: "destructive" });
  } finally { setRendering(false); }
}, [rendering, surahData, verses, cfg, ecfg, extraTranslations, extraTransliterations, previewSize, colors]);

  // Single declared rendering source instance prevents multi-mount DOM bugs
  const previewComponent = (
    <RenderSurahPreview 
      mode={mode} 
      cfg={cfg} 
      ecfg={ecfg} 
      verses={verses} 
      currentVerseIdx={0} 
      previewWrapRef={previewWrapRef} 
      previewAR={previewAR} 
      fullscreen={fullscreen} 
      setFullscreen={setFullscreen} 
      embedSnippet={embedSnippet} 
      introVisible={cfg.addIntro} 
      outroVisible={cfg.addOutro} 
      colors={colors} 
      pageFontFamily={() => "Uthmani"} 
      fontClass={fontClass} 
      posClasses={posClasses} 
      cornerCls={{tl:"top-3 left-3", tr:"top-3 right-3", bl:"bottom-3 left-3", br:"bottom-3 right-3"}} 
      ourLogoCorner="tr" 
    />
  );

  return (
    open ? (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto lg:overflow-hidden w-screen h-screen m-0 p-0 overscroll-behavior-contain">
      {/* Strict adherence to exact horizontal margins: px-2 sm:px-4, completely 0 bottom padding */}
      <div className="w-full h-full box-border m-0 p-0 px-2 sm:px-4 pb-0">
        
        <div className={cn(
          "grid gap-3 h-auto lg:h-full items-stretch w-full m-0 p-0", 
          fullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[360px_1fr]"
        )}>
          
          {!fullscreen && (
            <div className="h-auto lg:h-full w-full m-0 p-0 overflow-visible lg:overflow-hidden">
              <RenderSurahSidebar 
                mode={mode} 
                cfg={cfg} 
                setCfg={setCfg} 
                surahList={surahList} 
                allVerses={surahData?.verses ?? []} 
                rendering={rendering} 
                progress={progress} 
                resultUrl={resultUrl} 
                resultSize={resultSize} 
                resultExt={resultExt} 
                embedSnippet={embedSnippet} 
                cancelRef={cancelRef} 
                handleRender={handleRender} 
                onFile={onFile}
              >
                {previewComponent}
              </RenderSurahSidebar>
            </div>
          )}
          
          {/* Desktop Display Instance - hidden entirely on smaller media viewpoints */}
          <div className="hidden lg:block h-full w-full pt-14 pb-0 pl-0 pr-0 m-0 overflow-hidden box-border">
            {previewComponent}
          </div>
        </div>
      </div>
    </div>
    ) : null
  );
}