import { supabase } from "Client/Integration/supabase/client";

export interface QAQuestion {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  upvotes: number;
  answer_count: number;
  status: string;
  created_at: string;
}

export interface QAAnswer {
  id: string;
  question_id: string;
  user_id: string | null;
  body: string;
  is_official: boolean;
  upvotes: number;
  created_at: string;
}

export async function listQuestions(orderBy: "new" | "top" = "new"): Promise<QAQuestion[]> {
  const q = supabase.from("qa_questions").select("*").limit(200);
  if (orderBy === "top") q.order("upvotes", { ascending: false });
  q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QAQuestion[];
}

export async function getQuestion(id: string): Promise<QAQuestion | null> {
  const { data, error } = await supabase.from("qa_questions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as QAQuestion) ?? null;
}

export async function getAnswers(questionId: string): Promise<QAAnswer[]> {
  const { data, error } = await supabase
    .from("qa_answers")
    .select("*")
    .eq("question_id", questionId)
    .order("is_official", { ascending: false })
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QAAnswer[];
}

export async function createQuestion(title: string, body: string): Promise<QAQuestion> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("qa_questions")
    .insert({ title, body, user_id: u.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as QAQuestion;
}

export async function createAnswer(questionId: string, body: string, isOfficial = true): Promise<QAAnswer> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("qa_answers")
    .insert({ question_id: questionId, body, user_id: u.user.id, is_official: isOfficial })
    .select("*")
    .single();
  if (error) throw error;
  return data as QAAnswer;
}

export async function isAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getMyVotes(targetType: "question" | "answer", targetIds: string[]): Promise<Set<string>> {
  if (!targetIds.length) return new Set();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return new Set();
  const { data, error } = await supabase
    .from("qa_votes")
    .select("target_id")
    .eq("user_id", u.user.id)
    .eq("target_type", targetType)
    .in("target_id", targetIds);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { target_id: string }) => r.target_id));
}

export async function toggleVote(targetType: "question" | "answer", targetId: string): Promise<"added" | "removed"> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { data: existing } = await supabase
    .from("qa_votes")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("qa_votes").delete().eq("id", existing.id);
    if (error) throw error;
    return "removed";
  }
  const { error } = await supabase
    .from("qa_votes")
    .insert({ user_id: u.user.id, target_type: targetType, target_id: targetId });
  if (error) throw error;
  return "added";
}
