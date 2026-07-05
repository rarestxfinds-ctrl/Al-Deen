import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAG_CORPUS_PATH = path.resolve(__dirname, "../../Asset/Corpus/RAG.json");

export type CorpusDoc = { i: number; s: string; r: string; t: string };
export type RetrievedDoc = CorpusDoc & { score: number };

const STOP = new Set([
  "a","an","the","is","are","was","were","be","been","being","of","to","in","on","at","by","for","with","and","or","but","if","then","else","as","that","this","these","those","it","its","i","you","he","she","we","they","me","him","her","us","them","my","your","his","our","their","do","does","did","done","have","has","had","not","no","so","than","too","very","can","will","would","should","could","may","might","just","about","into","over","under","up","down","out","s","t"
]);

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

type Index = {
  docs: CorpusDoc[];
  N: number;
  avgdl: number;
  dl: Float32Array;
  postings: Map<string, { df: number; entries: { d: number; tf: number }[] }>;
  idf: Map<string, number>;
};

let cachedCorpus: CorpusDoc[] | null = null;
let indexPromise: Promise<Index> | null = null;

async function loadCorpus(): Promise<CorpusDoc[]> {
  if (cachedCorpus) return cachedCorpus;
  const raw = await fs.readFile(RAG_CORPUS_PATH, "utf-8");
  cachedCorpus = JSON.parse(raw) as CorpusDoc[];
  return cachedCorpus;
}

async function buildIndex(): Promise<Index> {
  const docs = await loadCorpus();

  const N = docs.length;
  const dl = new Float32Array(N);
  const postings = new Map<string, { df: number; entries: { d: number; tf: number }[] }>();
  let total = 0;

  for (let d = 0; d < N; d++) {
    const toks = tokenize(docs[d].t);
    dl[d] = toks.length;
    total += toks.length;
    const tfMap = new Map<string, number>();
    for (const w of toks) tfMap.set(w, (tfMap.get(w) || 0) + 1);
    for (const [w, tf] of tfMap) {
      let p = postings.get(w);
      if (!p) { p = { df: 0, entries: [] }; postings.set(w, p); }
      p.df += 1;
      p.entries.push({ d, tf });
    }
  }

  const avgdl = total / Math.max(N, 1);
  const idf = new Map<string, number>();
  for (const [w, p] of postings) {
    idf.set(w, Math.log(1 + (N - p.df + 0.5) / (p.df + 0.5)));
  }

  return { docs, N, avgdl, dl, postings, idf };
}

function ensureIndex(): Promise<Index> {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

const K1 = 1.4;
const B = 0.75;

export async function searchRAG(query: string, k = 8): Promise<RetrievedDoc[]> {
  const idx = await ensureIndex();
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) return [];

  const scores = new Map<number, number>();
  for (const w of qTokens) {
    const p = idx.postings.get(w);
    if (!p) continue;
    const idf = idx.idf.get(w)!;
    for (const { d, tf } of p.entries) {
      const len = idx.dl[d] || 1;
      const norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * len) / idx.avgdl));
      scores.set(d, (scores.get(d) || 0) + idf * norm);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([d, score]) => ({ ...idx.docs[d], score }));
}

// Kept for the existing /api/rag-corpus route, if you still want raw corpus access
export async function getRAGCorpus(): Promise<CorpusDoc[]> {
  return loadCorpus();
}

// Optional: warm the index at server boot so the first real request isn't slow
export function prewarmRAGIndex() {
  ensureIndex().catch((err) => console.error("Failed to prewarm RAG index:", err));
}