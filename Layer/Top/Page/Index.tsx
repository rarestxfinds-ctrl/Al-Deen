import { Layout } from "@/Top/Component/Layout/Index";
import { Card } from "@/Top/Component/UI/Card";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { Link } from "react-router-dom";

const Index = () => {
  const { t, isRtl } = useTranslation();

  return (
    <Layout>
      <div className="flex flex-row justify-center gap-3 w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex-1">
          <Link to="/Quran">
            <Card className="p-4 text-center hover:scale-[1.02] group">
              <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
                {t.nav.quran}
              </span>
            </Card>
          </Link>
        </div>
        <div className="flex-1">
          <Link to="/Hadith">
            <Card className="p-4 text-center hover:scale-[1.02] group">
              <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
                {t.nav.hadith}
              </span>
            </Card>
          </Link>
        </div>
        <div className="flex-1">
          <Link to="/Aid">
            <Card className="p-4 text-center hover:scale-[1.02] group">
              <span className="font-semibold text-base group-hover:text-white dark:group-hover:text-black">
                Aid
              </span>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Index;