import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";

const STEPS = [
  { title: "Intention (Niyyah)", body: "Make the silent intention in your heart for the prayer you are about to perform." },
  { title: "Takbir", body: "Raise your hands to your ears and say 'Allahu Akbar' to begin the prayer." },
  { title: "Qiyam", body: "Place your right hand over your left on your chest and recite Surah Al-Fatihah followed by another Surah." },
  { title: "Ruku", body: "Bow down, hands on knees, back straight, and say 'Subhana Rabbiyal Adheem' three times." },
  { title: "Standing from Ruku", body: "Rise back to standing while saying 'Sami'a Allahu liman hamidah, Rabbana wa lakal hamd'." },
  { title: "Sujud", body: "Prostrate with forehead, nose, palms, knees and toes on the ground. Say 'Subhana Rabbiyal A'la' three times." },
  { title: "Sitting Between Sujud", body: "Sit briefly and say 'Rabbighfir li' before the second prostration." },
  { title: "Tashahhud", body: "After the required rak'ahs, sit and recite the Tashahhud." },
  { title: "Salam", body: "Turn your head to the right then the left saying 'As-salamu alaykum wa rahmatullah' to end the prayer." },
];

export default function Namaz() {
  return (
    <Layout>
      <div className="space-y-3">
        {STEPS.map((s, i) => (
          <Container key={s.title} className="!p-4">
            <p className="text-xs text-muted-foreground">Step {i + 1}</p>
            <p className="font-semibold mt-1">{s.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
          </Container>
        ))}
      </div>
    </Layout>
  );
}
