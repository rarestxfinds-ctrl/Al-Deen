import { Layout } from "@/Top/Component/Layout/Index";
import { Card } from "@/Top/Component/UI/Card";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { Link } from "react-router-dom";

const Aid = () => {
  const { isRtl } = useTranslation();

  return (
    <Layout>
      <div className="flex flex-wrap gap-3 w-full" dir={isRtl ? "rtl" : "ltr"}>
        {/* Each card stretches to fill the row, but keeps its text‑based width */}
        <Link to="/Aid/Prayers" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Prayers
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Qibla" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Qibla
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Hijri-Calendar" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Hijri Calendar
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Zakat-Calculator" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Zakat Calculator
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Tasbih" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Tasbih
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Dua" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Duas
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Alphabet" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Alphabet
            </span>
          </Card>
        </Link>

        <Link to="/Aid/Tajweed" className="flex-1">
          <Card className="p-4 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-full">
            <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
              Tajweed
            </span>
          </Card>
        </Link>
      </div>
    </Layout>
  );
};

export default Aid;