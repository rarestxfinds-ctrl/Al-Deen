import { useMemo, useState } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Input } from "@/Component/UI/Input";
import { Label } from "@/Component/UI/Label";
import { Textarea } from "@/Component/UI/Textarea";
import { Button } from "@/Component/UI/Button";

// Islamic Will (Wasiyyah) generator. Up to 1/3 of the estate may be
// bequeathed to non-heirs or charitable causes; the remainder is
// distributed by faraid (see Inheritance Calculator).

interface Bequest { id: string; beneficiary: string; percent: number; purpose: string; }

export default function IslamicWill() {
  const [fullName, setFullName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [executor, setExecutor] = useState("");
  const [witness1, setWitness1] = useState("");
  const [witness2, setWitness2] = useState("");
  const [funeralWishes, setFuneralWishes] = useState("Janazah prayer and burial according to Sunnah, as soon as practical.");
  const [debts, setDebts] = useState("List all outstanding debts to be settled before distribution.");
  const [bequests, setBequests] = useState<Bequest[]>([]);

  const totalPct = useMemo(() => bequests.reduce((s, b) => s + (b.percent || 0), 0), [bequests]);
  const overLimit = totalPct > 33.33;

  const addBequest = () => setBequests([...bequests, { id: crypto.randomUUID(), beneficiary: "", percent: 0, purpose: "" }]);
  const update = (id: string, patch: Partial<Bequest>) =>
    setBequests(bequests.map(b => b.id === id ? { ...b, ...patch } : b));
  const remove = (id: string) => setBequests(bequests.filter(b => b.id !== id));

  const printWill = () => window.print();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <h1 className="text-2xl font-bold px-2">Islamic Will (Wasiyyah)</h1>
        <p className="text-sm text-muted-foreground px-2">
          A Muslim may bequeath up to one-third of the estate to non-heirs or charity. The remaining two-thirds is distributed
          by faraid. Consult a qualified scholar and lawyer before signing.
        </p>

        <Container className="!p-5 space-y-3">
          <h2 className="font-semibold">Testator</h2>
          <div className="space-y-1"><Label>Full legal name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1"><Label>Executor (Wasi)</Label>
              <Input value={executor} onChange={(e) => setExecutor(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Witness 1</Label>
              <Input value={witness1} onChange={(e) => setWitness1(e.target.value)} />
            </div>
            <div className="space-y-1"><Label>Witness 2</Label>
              <Input value={witness2} onChange={(e) => setWitness2(e.target.value)} />
            </div>
          </div>
        </Container>

        <Container className="!p-5 space-y-3">
          <h2 className="font-semibold">Funeral wishes</h2>
          <Textarea value={funeralWishes} onChange={(e) => setFuneralWishes(e.target.value)} />
        </Container>

        <Container className="!p-5 space-y-3">
          <h2 className="font-semibold">Debts &amp; obligations</h2>
          <Textarea value={debts} onChange={(e) => setDebts(e.target.value)} />
        </Container>

        <Container className="!p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Bequests (up to 1/3)</h2>
            <Button type="button" size="sm" onClick={addBequest}>Add bequest</Button>
          </div>
          {bequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No bequests added.</p>
          )}
          {bequests.map(b => (
            <div key={b.id} className="grid sm:grid-cols-[1fr_120px_1fr_auto] gap-2 items-end border-t border-border/30 pt-3">
              <div className="space-y-1"><Label>Beneficiary</Label>
                <Input value={b.beneficiary} onChange={(e) => update(b.id, { beneficiary: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>% of estate</Label>
                <Input type="number" min={0} max={33} value={b.percent}
                  onChange={(e) => update(b.id, { percent: Math.max(0, parseFloat(e.target.value) || 0) })} />
              </div>
              <div className="space-y-1"><Label>Purpose</Label>
                <Input value={b.purpose} onChange={(e) => update(b.id, { purpose: e.target.value })} />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => remove(b.id)}>Remove</Button>
            </div>
          ))}
          <div className={`text-sm font-medium ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            Total bequests: {totalPct.toFixed(2)}% {overLimit && "— exceeds 1/3 limit"}
          </div>
        </Container>

        <Container className="!p-5 print:!p-0">
          <div className="flex justify-between items-center mb-3 print:hidden">
            <h2 className="font-semibold">Preview</h2>
            <Button type="button" onClick={printWill}>Print / Save PDF</Button>
          </div>
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <h3>Last Will and Testament — Wasiyyah</h3>
            <p>I, <strong>{fullName || "[your name]"}</strong>, of sound mind, declare this to be my Islamic will on {date}.</p>
            <p><strong>Shahadah:</strong> I bear witness that there is no deity worthy of worship except Allah, and that Muhammad ﷺ is His messenger.</p>
            <p><strong>Executor:</strong> {executor || "[executor name]"}.</p>
            <p><strong>Funeral:</strong> {funeralWishes}</p>
            <p><strong>Debts:</strong> {debts}</p>
            <p><strong>Bequests (max 1/3):</strong></p>
            <ul>
              {bequests.length === 0 && <li>No specific bequests.</li>}
              {bequests.map(b => (
                <li key={b.id}>{b.beneficiary || "[beneficiary]"} — {b.percent}% — {b.purpose || "—"}</li>
              ))}
            </ul>
            <p>The remaining estate shall be distributed in accordance with the rules of Islamic inheritance (faraid).</p>
            <p>Signed: ____________________________ ({fullName || "testator"})</p>
            <p>Witness 1: {witness1 || "____________________________"}</p>
            <p>Witness 2: {witness2 || "____________________________"}</p>
          </article>
        </Container>
      </div>
    </Layout>
  );
}