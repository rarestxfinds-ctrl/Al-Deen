import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { useTranslation } from "@/Hook/Use-Translation";
import { Link } from "react-router-dom";

const Index = () => {
  const { t, isRtl } = useTranslation();

  return (
    <Layout>
      <div className="flex flex-row justify-center gap-3 w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex-1">
          <Link to="/Quran">
            <Card className="p-4 text-center group">
              <span className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {t.nav.quran}
              </span>
            </Card>
          </Link>
        </div>
        <div className="flex-1">
          <Link to="/Hadith">
            <Card className="p-4 text-center group">
              <span className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {t.nav.hadith}
              </span>
            </Card>
          </Link>
        </div>
        <div className="flex-1">
          <Link to="/Aid">
            <Card className="p-4 text-center group">
              <span className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
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