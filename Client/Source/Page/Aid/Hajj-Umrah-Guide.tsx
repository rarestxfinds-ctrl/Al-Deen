import { Link } from "react-router-dom";
import { CheckCircle2, CircleDot, Compass, MapPinned, PackageCheck, ShieldCheck } from "lucide-react";
import { Layout } from "@/Component/Layout/Index";
import { Card } from "@/Component/UI/Card";
import { Container } from "@/Component/UI/Container";

const preparation = [
  "Renew your intention and learn the rites before travelling.",
  "Prepare ihram clothing, comfortable sandals, medication, documents, and a small prayer mat.",
  "Settle debts, seek forgiveness, write emergency contacts, and keep copies of passports and bookings.",
  "Practice walking and plan rest, hydration, and shade breaks.",
];

const umrahSteps = [
  { title: "Ihram", body: "Enter the sacred state from the miqat, make ghusl if possible, wear ihram, pray, and say the talbiyah." },
  { title: "Tawaf", body: "Circle the Ka'bah seven times, starting and ending at the Black Stone line." },
  { title: "Maqam Ibrahim", body: "Pray two rak'ahs if space allows, then drink Zamzam." },
  { title: "Sa'i", body: "Walk seven lengths between Safa and Marwah, beginning at Safa and ending at Marwah." },
  { title: "Halq or Taqsir", body: "Men shave or trim; women trim a fingertip length. Umrah is complete." },
];

const hajjSteps = [
  { day: "8 Dhul Hijjah", title: "Mina", body: "Enter ihram for Hajj, pray in Mina, and prepare for Arafah." },
  { day: "9 Dhul Hijjah", title: "Arafah", body: "Stand in Arafah, make abundant dua, then move to Muzdalifah after sunset." },
  { day: "Night of 10", title: "Muzdalifah", body: "Pray Maghrib and Isha combined, rest, and collect pebbles." },
  { day: "10 Dhul Hijjah", title: "Eid rites", body: "Stone Jamarah al-Aqabah, sacrifice, shave or trim, then perform Tawaf al-Ifadah and Sa'i." },
  { day: "11–13 Dhul Hijjah", title: "Tashreeq", body: "Stay in Mina and stone the three Jamarat each day." },
  { day: "Before leaving", title: "Farewell Tawaf", body: "Perform Tawaf al-Wada before departing Makkah." },
];

const duas = [
  { label: "Talbiyah", text: "Labbayka Allahumma labbayk, labbayka la sharika laka labbayk." },
  { label: "Between Yemeni Corner and Black Stone", text: "Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina 'adhaban-nar." },
  { label: "General", text: "Ask Allah for forgiveness, acceptance, guidance, family, the Ummah, and Jannah." },
];

export default function HajjUmrahGuide() {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
          <Container className="!p-5 sm:!p-6">
            <p className="text-sm text-muted-foreground">Hajj & Umrah Guide</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Step-by-step pilgrimage companion</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              A practical guide for preparation, Umrah, Hajj days, duas, and safety reminders. Always follow your scholar, group leader, and local authority instructions for your exact package and fiqh needs.
            </p>
          </Container>
          <Card className="p-5" hoverable={false}>
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Quick essentials</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Keep water, ID, hotel card, and phone battery with you.</li>
              <li>Avoid arguments, harm, crowd pushing, and unnecessary heat exposure.</li>
              <li>Stay with your group during busy rites.</li>
            </ul>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="p-5" hoverable={false}>
            <div className="flex items-center gap-2 font-semibold"><PackageCheck className="h-5 w-5 text-primary" /> Preparation checklist</div>
            <div className="mt-4 space-y-3">
              {preparation.map((item) => (
                <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5" hoverable={false}>
            <div className="flex items-center gap-2 font-semibold"><Compass className="h-5 w-5 text-primary" /> Related tools</div>
            <div className="mt-4 grid gap-2">
              <Link to="/Aid/Qibla" className="text-sm text-primary font-semibold hover:underline">Qibla Direction</Link>
              <Link to="/Aid/Prayers" className="text-sm text-primary font-semibold hover:underline">Prayer Times</Link>
              <Link to="/Aid/Dua" className="text-sm text-primary font-semibold hover:underline">Dua Collection</Link>
              <Link to="/Aid/Masjid-Finder" className="text-sm text-primary font-semibold hover:underline">Masjid Finder</Link>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold px-1">Umrah steps</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {umrahSteps.map((step, index) => (
              <Card key={step.title} className="p-5" hoverable={false}>
                <p className="text-xs text-muted-foreground">Step {index + 1}</p>
                <p className="font-semibold mt-1">{step.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold px-1">Hajj timeline</h2>
          <div className="space-y-3">
            {hajjSteps.map((step) => (
              <Card key={step.day} className="p-5" hoverable={false}>
                <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary"><MapPinned className="h-4 w-4" /> {step.day}</div>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{step.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {duas.map((dua) => (
            <Card key={dua.label} className="p-5" hoverable={false}>
              <div className="flex items-center gap-2 font-semibold"><CircleDot className="h-4 w-4 text-primary" /> {dua.label}</div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">{dua.text}</p>
            </Card>
          ))}
        </section>
      </div>
    </Layout>
  );
}