// @Web/Component/Search/AdvancedQuery.ts
// Lightweight client-side parser for sunnah.com-style advanced search syntax:
//   "exact phrase"           — quoted exact phrase
//   wo?d / te*               — wildcards (? single char, * zero+ chars)
//   word~ / word~2           — fuzzy / proximity for quoted phrases
//   word^4                   — boost (recorded but only weakly used here)
//   (a OR b) AND c           — boolean grouping
//   OR (default) | AND | +req | NOT | -prohibit
//
// We don't implement a full Lucene engine — we compile the query into a
// predicate `(text) => boolean` that can be applied to any string field.

export type QueryPredicate = (text: string) => boolean;

type Token =
  | { kind: "phrase"; value: string; slop?: number }
  | { kind: "term"; value: string; fuzzy?: number; boost?: number }
  | { kind: "op"; value: "AND" | "OR" | "NOT" | "+" | "-" }
  | { kind: "lparen" }
  | { kind: "rparen" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"') {
      // phrase
      const end = input.indexOf('"', i + 1);
      const close = end === -1 ? n : end;
      const value = input.slice(i + 1, close);
      i = close + 1;
      // proximity ~N
      let slop: number | undefined;
      if (input[i] === "~") {
        i++;
        const m = input.slice(i).match(/^\d+/);
        if (m) {
          slop = parseInt(m[0], 10);
          i += m[0].length;
        }
      }
      tokens.push({ kind: "phrase", value, slop });
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === "+" || c === "-") {
      tokens.push({ kind: "op", value: c as "+" | "-" });
      i++;
      continue;
    }
    // term until whitespace / paren
    const m = input.slice(i).match(/^[^\s()]+/);
    if (!m) {
      i++;
      continue;
    }
    let raw = m[0];
    i += raw.length;

    // Boolean keyword detection (case-sensitive uppercase per spec)
    if (raw === "AND" || raw === "OR" || raw === "NOT") {
      tokens.push({ kind: "op", value: raw });
      continue;
    }

    // Boost (^N)
    let boost: number | undefined;
    const boostMatch = raw.match(/\^(\d+(?:\.\d+)?)$/);
    if (boostMatch) {
      boost = parseFloat(boostMatch[1]);
      raw = raw.slice(0, -boostMatch[0].length);
    }
    // Fuzzy (~N or just ~)
    let fuzzy: number | undefined;
    const fuzzyMatch = raw.match(/~(\d*)$/);
    if (fuzzyMatch) {
      fuzzy = fuzzyMatch[1] ? parseInt(fuzzyMatch[1], 10) : 2;
      raw = raw.slice(0, -fuzzyMatch[0].length);
    }
    if (!raw) continue;
    tokens.push({ kind: "term", value: raw, fuzzy, boost });
  }
  return tokens;
}

// --- helpers for matching individual tokens against text ---
function wildcardRegex(pattern: string): RegExp {
  // Escape regex specials except * and ?, then translate
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(body, "i");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp = Array.from({ length: bl + 1 }, (_, j) => j);
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[bl];
}

function matchTerm(term: Token & { kind: "term" }, text: string): boolean {
  const haystack = text.toLowerCase();
  const needle = term.value.toLowerCase();
  // Wildcard?
  if (/[*?]/.test(needle)) {
    const re = wildcardRegex(needle);
    // try word-by-word
    return haystack.split(/\W+/).some((w) => re.test(w));
  }
  // Fuzzy?
  if (term.fuzzy !== undefined) {
    const max = term.fuzzy;
    return haystack
      .split(/\W+/)
      .some((w) => w && levenshtein(w, needle) <= max);
  }
  return haystack.includes(needle);
}

function matchPhrase(p: Token & { kind: "phrase" }, text: string): boolean {
  const haystack = text.toLowerCase();
  const phrase = p.value.toLowerCase().trim();
  if (!phrase) return true;
  if (p.slop === undefined) return haystack.includes(phrase);
  // Proximity: all words must appear within `slop` words of each other (any order)
  const words = phrase.split(/\s+/);
  const indices: number[][] = words.map(() => []);
  const tokensInHay = haystack.split(/\W+/).filter(Boolean);
  tokensInHay.forEach((tok, i) => {
    words.forEach((w, wi) => {
      if (tok === w) indices[wi].push(i);
    });
  });
  if (indices.some((arr) => arr.length === 0)) return false;
  // Naive: take min/max positions and check span
  const picks = indices.map((arr) => arr[0]);
  const span = Math.max(...picks) - Math.min(...picks);
  return span <= p.slop + words.length;
}

// --- recursive-descent parser for AND/OR/NOT/(group) ---
class Parser {
  i = 0;
  constructor(public toks: Token[]) {}
  peek() {
    return this.toks[this.i];
  }
  eat() {
    return this.toks[this.i++];
  }
  parseExpr(): QueryPredicate {
    return this.parseOr();
  }
  parseOr(): QueryPredicate {
    let left = this.parseAnd();
    while (this.peek() && this.peek().kind === "op" && (this.peek() as any).value === "OR") {
      this.eat();
      const right = this.parseAnd();
      const l = left;
      left = (t) => l(t) || right(t);
    }
    return left;
  }
  parseAnd(): QueryPredicate {
    let left = this.parseUnary();
    while (this.peek()) {
      const p = this.peek();
      if (p.kind === "op" && (p.value === "AND" || p.value === "+")) {
        this.eat();
        const r = this.parseUnary();
        const l = left;
        left = (t) => l(t) && r(t);
      } else if (p.kind === "op" && p.value === "OR") {
        break;
      } else if (p.kind === "rparen") {
        break;
      } else {
        // implicit OR (default)
        const r = this.parseUnary();
        const l = left;
        left = (t) => l(t) || r(t);
      }
    }
    return left;
  }
  parseUnary(): QueryPredicate {
    const p = this.peek();
    if (p && p.kind === "op" && (p.value === "NOT" || p.value === "-")) {
      this.eat();
      const inner = this.parseAtom();
      return (t) => !inner(t);
    }
    return this.parseAtom();
  }
  parseAtom(): QueryPredicate {
    const p = this.peek();
    if (!p) return () => true;
    if (p.kind === "lparen") {
      this.eat();
      const inner = this.parseOr();
      if (this.peek()?.kind === "rparen") this.eat();
      return inner;
    }
    if (p.kind === "phrase") {
      this.eat();
      return (t) => matchPhrase(p as any, t);
    }
    if (p.kind === "term") {
      this.eat();
      return (t) => matchTerm(p as any, t);
    }
    // Stray operator — skip
    this.eat();
    return () => true;
  }
}

export function compileQuery(query: string): QueryPredicate {
  const trimmed = query.trim();
  if (!trimmed) return () => false;
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return () => false;
  return new Parser(tokens).parseExpr();
}

/** Build a predicate that runs the compiled query against any of several string fields. */
export function matchAnyField(
  query: string,
  getFields: (item: any) => Array<string | undefined | null>
) {
  const predicate = compileQuery(query);
  return (item: any) => {
    const fields = getFields(item).filter(Boolean) as string[];
    if (fields.length === 0) return false;
    const combined = fields.join(" \n ");
    return predicate(combined);
  };
}
