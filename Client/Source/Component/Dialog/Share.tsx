import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Component/UI/Dialog";
import { Button } from "@/Component/UI/Button";
import { Input } from "@/Component/UI/Input";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/Hook/Use-Toast";
import {
  Copy,
  Facebook,
  Twitter,
  MessageCircle,
  Link2,
  Check,
  X,
  Share2,
} from "lucide-react";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahId: number;
  ayahId?: number;
  verseText?: string;
  translation?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  surahId,
  ayahId,
  verseText,
  translation,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<"text" | "link" | null>(null);

  // Ingest structural database maps over unified reactive query cache
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
    enabled: open,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  const surah = useMemo(() => {
    if (surahList.length === 0) return null;
    return surahList.find((s: any) => s.id === surahId) || null;
  }, [surahList, surahId]);

  const verseRef = useMemo(() => {
    return ayahId
      ? `${surah?.englishName ?? "Surah"} ${surahId}:${ayahId}`
      : (surah?.englishName ?? "Surah");
  }, [surah, surahId, ayahId]);

  const shareUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/Quran/Surah/${surahId}${ayahId ? `?verse=${ayahId}` : ""}`;
  }, [surahId, ayahId]);

  const shareText = useMemo(() => {
    return translation
      ? `"${translation}" — ${verseRef} (Al-Deen.org)`
      : `${verseRef} — Al-Deen.org`;
  }, [translation, verseRef]);

  const copyText = async (text: string, kind: "text" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const shareToSocial = (platform: string) => {
    const t = encodeURIComponent(shareText);
    const u = encodeURIComponent(shareUrl);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const copyFullVerse = () => {
    const fullText =
      verseText && translation
        ? `${verseText}\n\n${translation}\n\n— ${verseRef}`
        : shareText;
    copyText(fullText, "text");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        aria-describedby={undefined}
      >
        <div className="!py-1 !px-1">
          <div className="flex items-center justify-between mb-4">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share {verseRef}
              </DialogTitle>
            </DialogHeader>
            <Button
              size="sm"
              variant="ghost"
              className="w-8 h-8 p-0 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {verseText && (
              <div className="p-4 rounded-3xl bg-muted/40 border border-border/30 space-y-2">
                <p
                  className="text-right font-arabic text-lg leading-loose"
                  dir="rtl"
                >
                  {verseText}
                </p>
                {translation && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translation}
                  </p>
                )}
                <p className="text-xs font-medium">— {verseRef}</p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="secondary"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={copyFullVerse}
              >
                {copied === "text" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="text-[11px]">Copy</span>
              </Button>
              <Button
                variant="secondary"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => shareToSocial("twitter")}
              >
                <Twitter className="h-4 w-4" />
                <span className="text-[11px]">Twitter</span>
              </Button>
              <Button
                variant="secondary"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => shareToSocial("facebook")}
              >
                <Facebook className="h-4 w-4" />
                <span className="text-[11px]">Facebook</span>
              </Button>
              <Button
                variant="secondary"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => shareToSocial("whatsapp")}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-[11px]">WhatsApp</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Share link
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs flex-1"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-9 h-9 p-0 rounded-full flex-shrink-0"
                  onClick={() => copyText(shareUrl, "link")}
                  aria-label="Copy link"
                >
                  {copied === "link" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {typeof navigator !== "undefined" && (navigator as any).share && (
              <Button
                className="w-full"
                onClick={() =>
                  (navigator as any).share({
                    title: verseRef,
                    text: shareText,
                    url: shareUrl,
                  })
                }
              >
                More sharing options
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}