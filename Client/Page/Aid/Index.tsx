import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";
import { useTranslation } from "Client/Hook/Use-Translation";
import { Link } from "react-router-dom";

const Aid = () => {
  const { isRtl } = useTranslation();

  const items = [
    { to: "/Aid/Prayers", label: "Prayer Time" },
    { to: "/Aid/Qibla", label: "Qibla Direction" },
    { to: "/Aid/Hijri-Calendar", label: "Hijri Calendar" },
    { to: "/Aid/Masjid-Finder", label: "Masjid Finder" },
    { to: "/Aid/Hajj-Umrah-Guide", label: "Hajj & Umrah Guide" },
    { to: "/Aid/Zakat-Calculator", label: "Zakat Calculator" },
    { to: "/Aid/Inheritance-Calculator", label: "Inheritance Calculator" },
    { to: "/Aid/Islamic-Will", label: "Islamic Will" },
    { to: "/Aid/Tasbih", label: "Tasbih Counter" },
    { to: "/Aid/Dua", label: "Dua" },
    { to: "/Aid/Arabic", label: "Arabic" },
    { to: "/Aid/AI", label: "AI Assistant" },
    { to: "/Aid/Ummah", label: "Ummah" },
    { to: "/Aid/Games", label: "Games" },
    { to: "/Aid/Names", label: "99 Names of Allah" },
    { to: "/Aid/Namaz", label: "How to Pray Namaz" },
    { to: "/Aid/Feeling", label: "I am Feeling" },
    { to: "/Aid/Prophets", label: "25 Prophets" },
    { to: "/Aid/Pillars", label: "5 Pillars of Islam" },
    { to: "/Aid/Articles", label: "6 Articles of Faith" },
    { to: "/Aid/Schools", label: "Schools & Branches" },
    { to: "/Aid/Q-and-A", label: "Q & A" },
  ];

  return (
    <Layout>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {items.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="p-4 text-center group">
              <span className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {item.label}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Aid;
