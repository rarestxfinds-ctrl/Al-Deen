import { useState, useRef, useEffect, useMemo } from "react";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { Textarea } from "Client/Component/UI/Textarea";
import { Input } from "Client/Component/UI/Input";
import {
  Send,
  Loader2,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  MessageSquare,
  Trash2,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "Client/Hook/Use-Toast";
import { supabase } from "Client/Integration/supabase/client";
import { cn } from "Client/Library/utils";
import { useIsMobile } from "Client/Hook/Use-Mobile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { search as ragSearch, prefetch as ragPrefetch } from "Server/API/RAG";


const MAX_INPUT_CHARS = 4000;

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Msg[]; updatedAt: number };
type SidebarMode = "maximized" | "minimized" | "closed";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;
const STORAGE_KEY = "ai-threads-v1";

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeThread(): Thread {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

export default function AI() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    const existing = loadThreads();
    if (existing.length > 0) return existing;
    return [makeThread()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = loadThreads();
    return existing[0]?.id ?? "";
  });
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("maximized");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [typingTarget, setTypingTarget] = useState<{ threadId: string; idx: number; full: string; shown: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => { ragPrefetch(); }, []);


  useEffect(() => {
    if (!activeId || !threads.find((t) => t.id === activeId)) {
      setActiveId(threads[0]?.id ?? "");
    }
  }, [activeId, threads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {}
  }, [threads]);

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const messages = active?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    taRef.current?.focus();
  }, [activeId]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [threads, search]);

  const newChat = () => {
    // Only create a new chat if the active one has at least one message.
    if (active && active.messages.length === 0) {
      setInput("");
      taRef.current?.focus();
      return;
    }
    const t = makeThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setInput("");
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = makeThread();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const updateActive = (updater: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === activeId ? updater(t) : t)));
  };

  const sendMessages = async (msgs: Msg[]) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // RAG: retrieve relevant passages for the latest user query
      const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";
      let context: { s: string; r: string; t: string }[] = [];
      try {
        const hits = await ragSearch(lastUser, 8);
        context = hits.map(({ s, r, t }) => ({ s, r, t }));
      } catch (err) {
        console.warn("RAG retrieval failed:", err);
      }
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: msgs, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      const reply = data.reply || "";
      const tid = activeId;
      // Append empty assistant message, then animate typing
      updateActive((t) => ({
        ...t,
        messages: [...msgs, { role: "assistant", content: "" }],
        updatedAt: Date.now(),
      }));
      setTypingTarget({ threadId: tid, idx: msgs.length, full: reply, shown: 0 });
    } catch (e) {
      toast({ title: "AI error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 0);
    }
  };

  // Typewriter effect for assistant replies
  useEffect(() => {
    if (!typingTarget) return;
    if (typingTarget.shown >= typingTarget.full.length) {
      setTypingTarget(null);
      return;
    }
    const step = Math.max(1, Math.round(typingTarget.full.length / 200));
    const timer = setTimeout(() => {
      const nextShown = Math.min(typingTarget.full.length, typingTarget.shown + step);
      const partial = typingTarget.full.slice(0, nextShown);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === typingTarget.threadId
            ? {
                ...t,
                messages: t.messages.map((m, i) =>
                  i === typingTarget.idx ? { ...m, content: partial } : m
                ),
              }
            : t
        )
      );
      setTypingTarget((tt) => (tt ? { ...tt, shown: nextShown } : tt));
    }, 25);
    return () => clearTimeout(timer);
  }, [typingTarget]);

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading || !active) return;
    const nextMessages: Msg[] = [...active.messages, { role: "user", content: value }];
    updateActive((t) => ({
      ...t,
      messages: nextMessages,
      title: t.messages.length === 0 ? value.slice(0, 40) : t.title,
      updatedAt: Date.now(),
    }));
    setInput("");
    await sendMessages(nextMessages);
  };

  const regenerateFrom = async (userIdx: number) => {
    if (!active || loading) return;
    const msgs = active.messages.slice(0, userIdx + 1);
    updateActive((t) => ({ ...t, messages: msgs, updatedAt: Date.now() }));
    await sendMessages(msgs);
  };

  const startEdit = (idx: number, current: string) => {
    setEditingIdx(idx);
    setEditingValue(current);
  };

  const saveEdit = async (idx: number) => {
    if (!active) return;
    const value = editingValue.trim();
    if (!value) return;
    const msgs = active.messages.slice(0, idx);
    msgs.push({ role: "user", content: value });
    updateActive((t) => ({ ...t, messages: msgs, updatedAt: Date.now() }));
    setEditingIdx(null);
    setEditingValue("");
    await sendMessages(msgs);
  };

  const isEmpty = messages.length === 0;

  const cycleSidebar = () => {
    if (isMobile) {
      setSidebarMode((m) => (m === "closed" ? "maximized" : "closed"));
      return;
    }
    setSidebarMode((m) => (m === "maximized" ? "minimized" : m === "minimized" ? "closed" : "maximized"));
  };

  // On mobile, default to closed; on desktop, default to maximized
  useEffect(() => {
    setSidebarMode(isMobile ? "closed" : "maximized");
  }, [isMobile]);


  const composer = (
    <div className="w-full flex gap-2 items-end">
      <div className="flex-1 flex flex-col">
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => {
            const v = e.target.value.slice(0, MAX_INPUT_CHARS);
            setInput(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything..."
          rows={1}
          maxLength={MAX_INPUT_CHARS}
          className="w-full resize-none min-h-[44px] max-h-32 overflow-y-auto rounded-full border border-border/30 bg-card text-foreground px-4 py-2.5"
        />
        {input.length > MAX_INPUT_CHARS * 0.8 && (
          <span className="text-[10px] text-muted-foreground self-end mt-1 mr-2">
            {input.length}/{MAX_INPUT_CHARS}
          </span>
        )}
      </div>
      <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon" className="rounded-full h-11 w-11 shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );

  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i;
    return -1;
  })();

  const mobileSidebarOpen = isMobile && sidebarMode !== "closed";

  return (
    <Layout hideFooter>
      <div className="relative flex gap-3 w-full" style={{ height: "calc(100vh - 6rem)" }}>
        {/* Mobile overlay trigger — always visible, on top of chat */}
        {isMobile && (
          <Button
            size="icon"
            variant="ghost"
            onClick={cycleSidebar}
            title={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm"
          >
            {mobileSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        )}

        {/* Sidebar */}
        {sidebarMode !== "closed" && (
          <aside
            className={cn(
              "flex flex-col shrink-0 transition-all duration-200",
              isMobile
                ? "absolute inset-0 z-40 bg-background pt-14 px-3 pb-3"
                : sidebarMode === "minimized"
                ? "w-12"
                : "w-60"
            )}
          >
            {!isMobile && (
              <div className="flex items-center gap-1 mb-2">
                <Button size="icon" variant="ghost" onClick={cycleSidebar} title="Toggle sidebar">
                  {sidebarMode === "maximized" ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </Button>
                {sidebarMode === "maximized" && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => setShowSearch((s) => !s)} title="Search">
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={newChat} title="New chat">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
            {isMobile && (
              <div className="flex items-center gap-1 mb-2 justify-end">
                <Button size="icon" variant="ghost" onClick={() => setShowSearch((s) => !s)} title="Search">
                  <Search className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={newChat} title="New chat">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {(isMobile || sidebarMode === "maximized") && showSearch && (
              <Input
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs mb-2"
              />
            )}

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredThreads.map((t) => {
                const showText = isMobile || sidebarMode === "maximized";
                return (
                  <Button
                    key={t.id}
                    variant="ghost"
                    active={t.id === activeId}
                    fullWidth
                    onClick={() => {
                      setActiveId(t.id);
                      if (isMobile) setSidebarMode("closed");
                    }}
                    className={cn(
                      "group justify-start gap-2 !px-2 !py-2 text-sm h-auto",
                      !showText && "justify-center"
                    )}
                    title={t.title}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {showText && (
                      <>
                        <span className="flex-1 truncate text-left">{t.title}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </>
                    )}
                  </Button>
                );
              })}
              {(isMobile || sidebarMode === "maximized") && filteredThreads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No chats</p>
              )}
            </div>
          </aside>
        )}

        {/* Floating reopen button when sidebar closed (desktop only) */}
        {!isMobile && sidebarMode === "closed" && (
          <div className="shrink-0">
            <Button size="icon" variant="ghost" onClick={() => setSidebarMode("maximized")} title="Open sidebar">
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chat area — hidden when mobile sidebar is open */}
        <div className={cn("flex-1 flex flex-col min-w-0", mobileSidebarOpen && "invisible")}>

          {isEmpty ? (
            <div className="flex-1 flex items-center justify-center px-2 sm:px-6">
              <div className="w-full max-w-2xl">{composer}</div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 space-y-4">
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const isLastAssistant = !isUser && i === lastAssistantIdx;
                  const editing = isUser && editingIdx === i;
                  return (
                    <div key={i} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start", editing && "w-full")}>
                      {editing ? (
                        <Textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 min-h-[60px]"
                          autoFocus
                        />
                      ) : isUser ? (
                        <Container className="!p-3 max-w-[85%]">
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                        </Container>
                      ) : (
                        <Container className="!p-3 max-w-[85%]">
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ""}</ReactMarkdown>
                            {typingTarget && typingTarget.threadId === active?.id && typingTarget.idx === i && (
                              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />
                            )}
                          </div>
                        </Container>
                      )}
                      <div className={cn("flex items-center gap-1", isUser ? "justify-end" : "justify-start")}>
                        {isUser && !editing && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(i, m.content)} className="h-7 px-2 text-xs">
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { navigator.clipboard.writeText(m.content); toast({ title: "Copied" }); }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isUser && editing && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => saveEdit(i)} className="h-7 px-2 text-xs">
                              <Check className="h-3 w-3 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(null); setEditingValue(""); }} className="h-7 px-2 text-xs">
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          </>
                        )}
                        {isLastAssistant && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => {
                              // find user msg before this assistant
                              for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") { regenerateFrom(j); break; }
                            }} disabled={loading} className="h-7 px-2 text-xs">
                              <RotateCcw className="h-3 w-3 mr-1" /> Regenerate
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { navigator.clipboard.writeText(m.content); toast({ title: "Copied" }); }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast({ title: "Thanks for the feedback" })}>
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast({ title: "Thanks for the feedback" })}>
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2">{composer}</div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
