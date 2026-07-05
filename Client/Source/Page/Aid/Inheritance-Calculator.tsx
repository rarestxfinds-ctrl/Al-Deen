import { useMemo, useState } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Input } from "@/Component/UI/Input";
import { Label } from "@/Component/UI/Label";

// Simplified Islamic inheritance (faraid) calculator covering the
// most common heir combinations. For complex estates please consult a scholar.

interface Heirs {
  spouseHusband: boolean;
  spouseWifeCount: number; // 0..4
  sons: number;
  daughters: number;
  father: boolean;
  mother: boolean;
  fullBrothers: number;
  fullSisters: number;
}

function calculate(estate: number, h: Heirs): { label: string; share: number; amount: number }[] {
  // Shares as fractions of estate after debts/bequests (assumed already deducted).
  const out: { label: string; share: number; amount: number }[] = [];
  const hasChildren = h.sons + h.daughters > 0;
  const hasMaleDescendant = h.sons > 0;

  // Spouse share
  let spouseShare = 0;
  if (h.spouseHusband) spouseShare = hasChildren ? 1 / 4 : 1 / 2;
  else if (h.spouseWifeCount > 0) spouseShare = hasChildren ? 1 / 8 : 1 / 4;

  if (h.spouseHusband) out.push({ label: "Husband", share: spouseShare, amount: 0 });
  if (h.spouseWifeCount > 0) {
    for (let i = 0; i < h.spouseWifeCount; i++) {
      out.push({ label: `Wife ${h.spouseWifeCount > 1 ? i + 1 : ""}`.trim(), share: spouseShare / h.spouseWifeCount, amount: 0 });
    }
  }

  // Mother
  let motherShare = 0;
  if (h.mother) {
    motherShare = hasChildren || h.fullBrothers + h.fullSisters >= 2 ? 1 / 6 : 1 / 3;
    out.push({ label: "Mother", share: motherShare, amount: 0 });
  }

  // Father
  let fatherShare = 0;
  if (h.father) {
    fatherShare = hasMaleDescendant ? 1 / 6 : hasChildren ? 1 / 6 : 0; // residual added below
    if (fatherShare > 0) out.push({ label: "Father (fixed)", share: fatherShare, amount: 0 });
  }

  // Children — residue split with 2:1 male:female ratio when sons present
  const fixedTotal = spouseShare + motherShare + fatherShare;
  let residue = Math.max(0, 1 - fixedTotal);

  if (hasChildren) {
    if (h.sons > 0) {
      const units = h.sons * 2 + h.daughters;
      const per = residue / units;
      for (let i = 0; i < h.sons; i++) out.push({ label: `Son ${h.sons > 1 ? i + 1 : ""}`.trim(), share: per * 2, amount: 0 });
      for (let i = 0; i < h.daughters; i++) out.push({ label: `Daughter ${h.daughters > 1 ? i + 1 : ""}`.trim(), share: per, amount: 0 });
      residue = 0;
    } else {
      // daughters only: 1/2 (single) or 2/3 (two or more)
      const dShare = h.daughters === 1 ? 1 / 2 : 2 / 3;
      const per = dShare / h.daughters;
      for (let i = 0; i < h.daughters; i++) out.push({ label: `Daughter ${h.daughters > 1 ? i + 1 : ""}`.trim(), share: per, amount: 0 });
      residue = Math.max(0, residue - dShare);
    }
  }

  // Father gets residue if no male descendants
  if (h.father && !hasMaleDescendant && residue > 0) {
    out.push({ label: "Father (residue)", share: residue, amount: 0 });
    residue = 0;
  }

  // Full siblings (only if no father and no male descendants)
  if (!h.father && !hasMaleDescendant && residue > 0 && h.fullBrothers + h.fullSisters > 0) {
    const units = h.fullBrothers * 2 + h.fullSisters;
    const per = residue / units;
    for (let i = 0; i < h.fullBrothers; i++) out.push({ label: `Brother ${h.fullBrothers > 1 ? i + 1 : ""}`.trim(), share: per * 2, amount: 0 });
    for (let i = 0; i < h.fullSisters; i++) out.push({ label: `Sister ${h.fullSisters > 1 ? i + 1 : ""}`.trim(), share: per, amount: 0 });
    residue = 0;
  }

  return out.map(r => ({ ...r, amount: r.share * estate }));
}

export default function InheritanceCalculator() {
  const [estate, setEstate] = useState(100000);
  const [h, setH] = useState<Heirs>({
    spouseHusband: false, spouseWifeCount: 0,
    sons: 0, daughters: 0,
    father: false, mother: false,
    fullBrothers: 0, fullSisters: 0,
  });

  const rows = useMemo(() => calculate(estate, h), [estate, h]);
  const total = rows.reduce((s, r) => s + r.share, 0);

  const num = (v: string) => Math.max(0, parseInt(v || "0", 10) || 0);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <h1 className="text-2xl font-bold px-2">Inheritance Calculator</h1>
        <p className="text-sm text-muted-foreground px-2">
          Simplified Islamic inheritance shares (faraid). Assumes debts and bequests have already been deducted from the estate.
        </p>

        <Container className="!p-5 space-y-4">
          <div className="space-y-2">
            <Label>Estate value</Label>
            <Input type="number" min={0} value={estate} onChange={(e) => setEstate(num(e.target.value))} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={h.spouseHusband} onChange={(e) => setH({ ...h, spouseHusband: e.target.checked, spouseWifeCount: e.target.checked ? 0 : h.spouseWifeCount })} />
              <span>Husband alive</span>
            </label>
            <div className="space-y-1">
              <Label>Wives (0–4)</Label>
              <Input type="number" min={0} max={4} value={h.spouseWifeCount} disabled={h.spouseHusband}
                onChange={(e) => setH({ ...h, spouseWifeCount: Math.min(4, num(e.target.value)) })} />
            </div>

            <div className="space-y-1"><Label>Sons</Label>
              <Input type="number" min={0} value={h.sons} onChange={(e) => setH({ ...h, sons: num(e.target.value) })} />
            </div>
            <div className="space-y-1"><Label>Daughters</Label>
              <Input type="number" min={0} value={h.daughters} onChange={(e) => setH({ ...h, daughters: num(e.target.value) })} />
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={h.father} onChange={(e) => setH({ ...h, father: e.target.checked })} />
              <span>Father alive</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={h.mother} onChange={(e) => setH({ ...h, mother: e.target.checked })} />
              <span>Mother alive</span>
            </label>

            <div className="space-y-1"><Label>Full brothers</Label>
              <Input type="number" min={0} value={h.fullBrothers} onChange={(e) => setH({ ...h, fullBrothers: num(e.target.value) })} />
            </div>
            <div className="space-y-1"><Label>Full sisters</Label>
              <Input type="number" min={0} value={h.fullSisters} onChange={(e) => setH({ ...h, fullSisters: num(e.target.value) })} />
            </div>
          </div>
        </Container>

        <Container className="!p-5">
          <h2 className="font-semibold mb-3">Distribution</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add at least one heir.</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-border/30 py-1.5">
                  <span>{r.label}</span>
                  <span className="tabular-nums">
                    {(r.share * 100).toFixed(2)}% · {r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-2">
                <span>Total allocated</span>
                <span className="tabular-nums">{(total * 100).toFixed(2)}%</span>
              </div>
              {total < 0.999 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Remaining {(100 - total * 100).toFixed(2)}% goes to other residuary heirs (asabah) not modeled here.
                </p>
              )}
            </div>
          )}
        </Container>
      </div>
    </Layout>
  );
}