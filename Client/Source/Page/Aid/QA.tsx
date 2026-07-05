import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/Component/Layout/Index";
import { Card } from "@/Component/UI/Card";
import { Button } from "@/Component/UI/Button";
import { useAuth } from "@/Context/Auth";
import { toast } from "@/Hook/Use-Toast";
import { ArrowUp, MessageSquare, Plus } from "lucide-react";
import {
  listQuestions,
  createQuestion,
  toggleVote,
  getMyVotes,
  type QAQuestion,
} from "@/Library/QA";

const QA = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"new" | "top">("new");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listQuestions(sortBy);
      setQuestions(list);
      if (user) setVoted(await getMyVotes("question", list.map(q => q.id)));
    } catch (e: unknown) {
      toast({ title: "Failed to load", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sortBy, user?.id]);

  const handleVote = async (id: string) => {
    if (!user) { toast({ title: "Sign in required" }); return; }
    try {
      const result = await toggleVote("question", id);
      setVoted(prev => {
        const next = new Set(prev);
        if (result === "added") next.add(id); else next.delete(id);
        return next;
      });
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, upvotes: q.upvotes + (result === "added" ? 1 : -1) } : q));
    } catch (e: unknown) {
      toast({ title: "Vote failed", description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "Sign in required" }); return; }
    if (title.trim().length < 5 || body.trim().length < 5) {
      toast({ title: "Title and body must be at least 5 characters" }); return;
    }
    setSubmitting(true);
    try {
      await createQuestion(title.trim(), body.trim());
      setTitle(""); setBody(""); setComposerOpen(false);
      toast({ title: "Question posted" });
      await refresh();
    } catch (e: unknown) {
      toast({ title: "Submission failed", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Q &amp; A</h1>
          <div className="flex gap-2">
            <Button
              variant={sortBy === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("new")}
            >New</Button>
            <Button
              variant={sortBy === "top" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("top")}
            >Top</Button>
            <Button size="sm" onClick={() => user ? setComposerOpen(o => !o) : toast({ title: "Sign in required" })}>
              <Plus className="h-4 w-4 mr-1" /> Ask
            </Button>
          </div>
        </div>

        {composerOpen && (
          <Card className="p-4 space-y-3">
            <input
              className="w-full bg-transparent border rounded-md px-3 py-2 text-sm"
              placeholder="Question title (e.g. What breaks wudu?)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={300}
            />
            <textarea
              className="w-full bg-transparent border rounded-md px-3 py-2 text-sm min-h-[120px]"
              placeholder="Add context, what you've already read, etc."
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={10000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setComposerOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
        ) : questions.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No questions yet. Be the first to ask.
          </Card>
        ) : (
          <ul className="space-y-2">
            {questions.map(q => (
              <li key={q.id}>
                <Card className="p-4 flex gap-3 items-start">
                  <button
                    onClick={() => handleVote(q.id)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md border text-xs shrink-0 ${voted.has(q.id) ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"}`}
                    aria-label="Upvote"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="font-semibold">{q.upvotes}</span>
                  </button>
                  <Link to={`/Aid/Q-and-A/${q.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{q.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {q.answer_count}
                      </span>
                      <span>{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default QA;
