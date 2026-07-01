// Client/Component/Dialog/Render-Surah-Sidebar.tsx
import React, { useState } from "react";
import { Button } from "Client/Component/UI/Button";
import { Input } from "Client/Component/UI/Input";
import { Label } from "Client/Component/UI/Label";
import { Switch } from "Client/Component/UI/Switch";
import { Slider } from "Client/Component/UI/Slider";
import { cn } from "Client/Library/utils";
import { Loader2, Download, Copy, ChevronDown } from "lucide-react";
import { toast } from "Client/Hook/Use-Toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "Client/Component/UI/Select";
import {
  type Config,
  type Position,
  type Corner,
  RESOLUTIONS,
  RECITERS,
  POSITIONS,
} from "./Types";

interface SidebarProps {
  mode: "render" | "embed";
  cfg: Config;
  setCfg: React.Dispatch<React.SetStateAction<Config>>;
  surahList: Array<{ id: number; englishName: string }>;
  allVerses: any[];
  rendering: boolean;
  progress: number;
  resultUrl: string | null;
  resultSize: number;
  resultExt: string;
  embedSnippet: string;
  cancelRef: React.MutableRefObject<boolean>;
  handleRender: () => Promise<void>;
  onFile: (field: "bgUrl" | "logoUrl" | "containerBgUrl", kindField?: "image" | "video") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}

export function RenderSurahSidebar({
  mode, cfg, setCfg, surahList, allVerses, rendering, progress,
  resultUrl, resultSize, resultExt, embedSnippet, cancelRef, handleRender, onFile, children
}: SidebarProps) {
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    output: true,
    background: true,
    size: true,
    colors: false,
    positioning: false,
    overlays: false,
    media: false,
    embed: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex flex-col h-full w-full m-0 p-0 overflow-hidden">
      
      {/* Scroll track configuration wrapper layer */}
      <div className="flex-1 w-full overflow-y-visible lg:overflow-y-auto m-0 p-0 lg:scrollbar-none lg:[&::-webkit-scrollbar]:hidden lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] overscroll-contain touch-pan-y">
        
        {/* Internal layout list container:
          - `pt-14` provides symmetrical top spacing.
          - `pb-14 lg:pb-24` serves as a dynamic bottom safety cushion. When scrolled completely down, 
            it ensures your preview card or output items never touch the screen's bottom layout threshold.
        */}
        <div className="pt-14 pb-2 lg:pb-2 pl-0 pr-0 space-y-3 w-full m-0 p-0 box-border">
          
          {/* Output Section */}
          <DropdownCard title="Output" isOpen={openSections.output} onToggle={() => toggleSection("output")}>
            {mode === "render" && (
              <>
                <Row label="Resolution">
                  <Select value={cfg.resolution} onValueChange={(v: Config["resolution"]) => setCfg((c) => ({ ...c, resolution: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESOLUTIONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Format">
                  <Select value={cfg.exportFormat} onValueChange={(v: Config["exportFormat"]) => setCfg((c) => ({ ...c, exportFormat: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webm">WebM (VP9)</SelectItem>
                      <SelectItem value="mp4">MP4</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Reciter">
                  <Select value={cfg.reciter} onValueChange={(v) => setCfg((c) => ({ ...c, reciter: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECITERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
              </>
            )}
            <Row label="Surah">
              <Select value={String(cfg.surahId)} onValueChange={(v) => setCfg((c) => ({ ...c, surahId: parseInt(v), ayahStart: 1, ayahEnd: 1 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {surahList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.id}. {s.englishName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="From Ayah">
              <Select value={String(cfg.ayahStart)} onValueChange={(v) => setCfg((c) => {
                const s = parseInt(v); return { ...c, ayahStart: s, ayahEnd: Math.max(s, c.ayahEnd) };
              })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {allVerses.map((v) => (
                    <SelectItem key={v.verseNumber} value={String(v.verseNumber)}>{v.verseNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="To Ayah">
              <Select value={String(cfg.ayahEnd)} onValueChange={(v) => setCfg((c) => ({ ...c, ayahEnd: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {allVerses.filter((v) => v.verseNumber >= cfg.ayahStart).map((v) => (
                    <SelectItem key={v.verseNumber} value={String(v.verseNumber)}>{v.verseNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </DropdownCard>

          {/* Background Section */}
          {mode === "render" && (
            <DropdownCard title="Background" isOpen={openSections.background} onToggle={() => toggleSection("background")}>
              <Row label="Color">
                <input type="color" value={cfg.bgColor}
                  onChange={(e) => setCfg((c) => ({ ...c, bgColor: e.target.value, bgKind: "color" }))}
                  className="h-8 w-full rounded border-0 bg-transparent cursor-pointer" />
              </Row>
              <Row label="Image">
                <Input type="file" accept="image/*" onChange={onFile("bgUrl", "image")} className="text-xs" />
              </Row>
              <Row label="Video">
                <Input type="file" accept="video/*" onChange={onFile("bgUrl", "video")} className="text-xs" />
              </Row>
            </DropdownCard>
          )}

          {/* Embed Dimensions */}
          {mode === "embed" && (
            <DropdownCard title="Size" isOpen={openSections.size} onToggle={() => toggleSection("size")}>
              <Row label="Width"><Input type="number" value={cfg.width}
                onChange={(e) => setCfg((c) => ({ ...c, width: Math.max(120, parseInt(e.target.value || "0") || 0) }))} /></Row>
              <Row label="Height"><Input type="number" value={cfg.height}
                onChange={(e) => setCfg((c) => ({ ...c, height: Math.max(120, parseInt(e.target.value || "0") || 0) }))} /></Row>
            </DropdownCard>
          )}

          {/* Colors */}
          <DropdownCard title="Colors" isOpen={openSections.colors} onToggle={() => toggleSection("colors")}>
            <ToggleRow label="Auto contrast" value={cfg.autoContrast} onChange={(v) => setCfg((c) => ({ ...c, autoContrast: v }))} />
            <ColorRow label="Arabic" value={cfg.arabicColor} onChange={(v) => setCfg((c) => ({ ...c, arabicColor: v }))} />
            <ColorRow label="Translation" value={cfg.translationColor} onChange={(v) => setCfg((c) => ({ ...c, translationColor: v }))} />
            <ColorRow label="Transliteration" value={cfg.transliterationColor} onChange={(v) => setCfg((c) => ({ ...c, transliterationColor: v }))} />
            <ColorRow label="Highlight" value={cfg.highlightColor} onChange={(v) => setCfg((c) => ({ ...c, highlightColor: v }))} />
          </DropdownCard>

          {/* Positioning */}
          <DropdownCard title="Positioning" isOpen={openSections.positioning} onToggle={() => toggleSection("positioning")}>
            <Row label="Arabic">
              <Select value={cfg.arabicPosition} onValueChange={(v: Position) => setCfg((c) => ({ ...c, arabicPosition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Translation">
              <Select value={cfg.translationPosition} onValueChange={(v: Position) => setCfg((c) => ({ ...c, translationPosition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Transliteration">
              <Select value={cfg.transliterationPosition} onValueChange={(v: Position) => setCfg((c) => ({ ...c, transliterationPosition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
          </DropdownCard>

          {/* Overlays */}
          <DropdownCard title="Overlays" isOpen={openSections.overlays} onToggle={() => toggleSection("overlays")}>
            <ToggleRow label="Show Lines" value={cfg.showLines} onChange={(v) => setCfg((c) => ({ ...c, showLines: v }))} />
            {cfg.showLines && (
              <SliderRow label="Line Count" value={cfg.linesCount} min={4} max={20} onChange={(v) => setCfg((c) => ({ ...c, linesCount: v }))} />
            )}
            <ToggleRow label="Show Watermark" value={cfg.showWatermark} onChange={(v) => setCfg((c) => ({ ...c, showWatermark: v }))} />
            {cfg.showWatermark && (
              <Row label="Text">
                <Input value={cfg.watermarkText} onChange={(e) => setCfg((c) => ({ ...c, watermarkText: e.target.value }))} />
              </Row>
            )}
          </DropdownCard>

          {/* Media & Assets */}
          {mode === "render" && (
            <DropdownCard title="Intro, Outro & Logo" isOpen={openSections.media} onToggle={() => toggleSection("media")}>
              <ToggleRow label="Add Intro" value={cfg.addIntro} onChange={(v) => setCfg((c) => ({ ...c, addIntro: v }))} />
              {cfg.addIntro && (
                <Input type="file" accept="video/*" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setCfg((c) => ({ ...c, introUrl: URL.createObjectURL(f) }));
                }} className="text-xs mt-1 mb-2" />
              )}
              <ToggleRow label="Add Outro" value={cfg.addOutro} onChange={(v) => setCfg((c) => ({ ...c, addOutro: v }))} />
              {cfg.addOutro && (
                <Input type="file" accept="video/*" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setCfg((c) => ({ ...c, outroUrl: URL.createObjectURL(f) }));
                }} className="text-xs mt-1 mb-3" />
              )}
              <hr className="border-border/20 my-2" />
              <Row label="Logo Upload">
                <Input type="file" accept="image/*" onChange={onFile("logoUrl")} className="text-xs" />
              </Row>
              <Row label="Logo Corner">
                <Select value={cfg.logoCorner} onValueChange={(v: Corner) => setCfg((c) => ({ ...c, logoCorner: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tl">Top Left</SelectItem>
                    <SelectItem value="tr">Top Right</SelectItem>
                    <SelectItem value="bl">Bottom Left</SelectItem>
                    <SelectItem value="br">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </DropdownCard>
          )}

          {/* Embed configurations */}
          {mode === "embed" && (
            <DropdownCard title="Embed Options" isOpen={openSections.embed} onToggle={() => toggleSection("embed")}>
              <ToggleRow label="Audio Playback" value={cfg.audioPlayback} onChange={(v) => setCfg((c) => ({ ...c, audioPlayback: v }))} />
              <ToggleRow label="Show Tafsir Button" value={cfg.showTafsir} onChange={(v) => setCfg((c) => ({ ...c, showTafsir: v }))} />
              <ToggleRow label="Show Copy Button" value={cfg.showCopy} onChange={(v) => setCfg((c) => ({ ...c, showCopy: v }))} />
              <ToggleRow label="Show Share Button" value={cfg.showShare} onChange={(v) => setCfg((c) => ({ ...c, showShare: v }))} />
              <ToggleRow label="Hover Tooltip" value={cfg.hoverTooltip} onChange={(v) => setCfg((c) => ({ ...c, hoverTooltip: v }))} />
            </DropdownCard>
          )}

          {/* ============ DOWNLOAD ACTIONS PANEL ============ */}
          <div className="pt-2 w-full space-y-2 m-0 p-0">
            {mode === "render" ? (
              <>
                <Button className="w-full gap-2 font-medium shadow-sm" onClick={handleRender} disabled={rendering}>
                  {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {rendering ? `Rendering… ${Math.round(progress * 100)}%` : "Render & Download"}
                </Button>
                {rendering && (
                  <>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground transition-all" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { cancelRef.current = true; }}>
                      Cancel
                    </Button>
                  </>
                )}
                {resultUrl && !rendering && (
                  <div className="space-y-2 pt-2 border-t border-border/20 w-full m-0 p-0">
                    <video src={resultUrl} controls className="w-full rounded-lg bg-black max-h-32 object-contain" />
                    <div className="text-[10px] text-muted-foreground text-center">
                      {(resultSize / 1024 / 1024).toFixed(1)} MB • .{resultExt}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Button className="w-full gap-2 font-medium shadow-sm" onClick={() => {
                navigator.clipboard?.writeText(embedSnippet);
                toast({ title: "Embed snippet copied" });
              }}><Copy className="h-4 w-4" /> Copy Embed Snippet</Button>
            )}
          </div>

          {/* ============ MOBILE-ONLY PREVIEW AT THE BOTTOM ============ */}
          {children && (
            <div className="block lg:hidden w-full pt-6 border-t border-border/20 m-0 pb-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Live Preview
              </div>
              {children}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function DropdownCard({ 
  title, children, isOpen, onToggle 
}: { title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden transition-all duration-200 shadow-sm w-full m-0 p-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-card/20 hover:bg-card/50 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>
      
      <div className={cn("transition-all duration-200 ease-in-out w-full m-0", isOpen ? "p-3 h-auto opacity-100 block" : "h-0 opacity-0 hidden")}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 mb-2 last:mb-0 w-full m-0 p-0">
      <Label className="text-xs text-foreground/80 whitespace-nowrap">{label}</Label>
      <div className="w-full min-w-0 m-0 p-0">{children}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mb-2 last:mb-0 w-full m-0 p-0">
      <Label className="text-xs text-foreground/80">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 mb-2 last:mb-0 w-full m-0 p-0">
      <Label className="text-xs text-foreground/80">{label}</Label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-full rounded border border-border/40 bg-transparent cursor-pointer" />
    </div>
  );
}

function SliderRow({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-2 last:mb-0 w-full m-0 p-0">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-foreground/80">{label}</Label>
        <span className="text-xs text-muted-foreground">{value}px</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}