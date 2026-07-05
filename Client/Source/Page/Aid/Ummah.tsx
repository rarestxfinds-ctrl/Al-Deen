import { useState, useEffect, FormEvent } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Card } from "@/Component/UI/Card";
import { Button } from "@/Component/UI/Button";
import { Textarea } from "@/Component/UI/Textarea";
import { useAuth } from "@/Context/Auth";
import { Heart, MessageCircle, Repeat2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  createdAt: number;
  likes: string[]; // user ids
  reposts: string[];
  replies: Reply[];
}
interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  createdAt: number;
}

const STORAGE_KEY = "ummah-posts-v1";
const MAX_LEN = 280;

function loadPosts(): Post[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Post[];
  } catch { return []; }
}
function savePosts(p: Post[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Ummah() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => { setPosts(loadPosts()); }, []);

  const meta = (user?.user_metadata ?? {}) as { display_name?: string; username?: string; first_name?: string; last_name?: string };
  const authorName = meta.display_name || [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "Guest";
  const authorHandle = meta.username || (user?.email?.split("@")[0] ?? "guest");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !user) return;
    const p: Post = {
      id: crypto.randomUUID(),
      authorId: user.id,
      authorName,
      authorHandle,
      content: content.slice(0, MAX_LEN),
      createdAt: Date.now(),
      likes: [],
      reposts: [],
      replies: [],
    };
    const next = [p, ...posts];
    setPosts(next); savePosts(next); setDraft("");
  };

  const toggleLike = (id: string) => {
    if (!user) return;
    const next = posts.map(p => p.id === id ? {
      ...p, likes: p.likes.includes(user.id) ? p.likes.filter(x => x !== user.id) : [...p.likes, user.id],
    } : p);
    setPosts(next); savePosts(next);
  };
  const toggleRepost = (id: string) => {
    if (!user) return;
    const next = posts.map(p => p.id === id ? {
      ...p, reposts: p.reposts.includes(user.id) ? p.reposts.filter(x => x !== user.id) : [...p.reposts, user.id],
    } : p);
    setPosts(next); savePosts(next);
  };
  const remove = (id: string) => {
    const next = posts.filter(p => p.id !== id);
    setPosts(next); savePosts(next);
  };
  const submitReply = (postId: string) => {
    const content = replyDraft.trim();
    if (!content || !user) return;
    const reply: Reply = {
      id: crypto.randomUUID(),
      authorId: user.id, authorName, authorHandle,
      content: content.slice(0, MAX_LEN), createdAt: Date.now(),
    };
    const next = posts.map(p => p.id === postId ? { ...p, replies: [...p.replies, reply] } : p);
    setPosts(next); savePosts(next); setReplyDraft(""); setReplyOpen(null);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-4">
        <h1 className="text-2xl font-bold px-2">Ummah</h1>

        {user ? (
          <Container className="!p-4">
            <form onSubmit={submit} className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                placeholder="Share something good with the Ummah..."
                className="min-h-[90px]"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/{MAX_LEN}</span>
                <Button type="submit" variant="primary" className="px-6" {...(!draft.trim() ? { "aria-disabled": true, style: { opacity: 0.5, pointerEvents: "none" } } : {})}>Post</Button>
              </div>
            </form>
          </Container>
        ) : (
          <Card className="p-4 text-center">
            <p className="text-sm">
              <Link to="/Sign-In" className="text-primary font-semibold hover:underline">Sign in</Link> or{" "}
              <Link to="/Sign-Up" className="text-primary font-semibold hover:underline">create an account</Link> to post.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No posts yet. Be the first to share.</p>
          )}
          {posts.map(p => {
            const liked = !!user && p.likes.includes(user.id);
            const reposted = !!user && p.reposts.includes(user.id);
            const mine = !!user && p.authorId === user.id;
            return (
              <Card key={p.id} className="p-4" hoverable={false}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center font-semibold shrink-0">
                    {p.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold truncate">{p.authorName}</span>
                      <span className="text-xs text-muted-foreground truncate">@{p.authorHandle}</span>
                      <span className="text-xs text-muted-foreground">· {timeAgo(p.createdAt)}</span>
                      {mine && (
                        <button onClick={() => remove(p.id)} className="ml-auto text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">{p.content}</p>
                    <div className="flex items-center gap-6 mt-3 text-muted-foreground text-xs">
                      <button onClick={() => setReplyOpen(replyOpen === p.id ? null : p.id)} className="flex items-center gap-1 hover:text-primary">
                        <MessageCircle className="h-4 w-4" /> {p.replies.length}
                      </button>
                      <button onClick={() => toggleRepost(p.id)} className={`flex items-center gap-1 hover:text-green-500 ${reposted ? "text-green-500" : ""}`}>
                        <Repeat2 className="h-4 w-4" /> {p.reposts.length}
                      </button>
                      <button onClick={() => toggleLike(p.id)} className={`flex items-center gap-1 hover:text-rose-500 ${liked ? "text-rose-500" : ""}`}>
                        <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {p.likes.length}
                      </button>
                    </div>

                    {replyOpen === p.id && user && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value.slice(0, MAX_LEN))}
                          placeholder="Post your reply"
                          className="min-h-[60px]"
                        />
                        <div className="flex justify-end">
                          <Button type="button" onClick={() => submitReply(p.id)} variant="primary" size="sm">Reply</Button>
                        </div>
                      </div>
                    )}

                    {p.replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-border/40 pl-3">
                        {p.replies.map(r => (
                          <div key={r.id} className="text-xs">
                            <span className="font-semibold">{r.authorName}</span>{" "}
                            <span className="text-muted-foreground">@{r.authorHandle} · {timeAgo(r.createdAt)}</span>
                            <p className="mt-0.5 whitespace-pre-wrap break-words">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}