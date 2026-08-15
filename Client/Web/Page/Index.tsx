import { useEffect } from "react";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { useTranslation } from "@/Hook/Use-Translation";
import { Link } from "react-router-dom";

const Index = () => {
  const { t, isRtl } = useTranslation();

  useEffect(() => {
    const ensureDatabaseDownloaded = async () => {
      const dbName = "QuranDB";
      const storeName = "files";
      const fileName = "Core.db";

      const checkIndexedDB = (): Promise<ArrayBuffer | null> =>
        new Promise((resolve) => {
          const request = indexedDB.open(dbName, 1);

          request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          };

          request.onsuccess = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.close();
              resolve(null);
              return;
            }
            try {
              const tx = db.transaction(storeName, "readonly");
              const store = tx.objectStore(storeName);
              const getReq = store.get(fileName);
              getReq.onsuccess = () => resolve(getReq.result || null);
              getReq.onerror = () => resolve(null);
            } catch {
              resolve(null);
            }
          };

          request.onerror = () => resolve(null);
        });

      let localBuffer = await checkIndexedDB();
      if (localBuffer) {
        return;
      }

      try {
        const response = await fetch("/Wajihat-Barmajatt-At-Tatbiqat/At-Tanzil/Al-Quran/Core.db");
        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        const saveRequest = indexedDB.open(dbName, 1);
        saveRequest.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };

        saveRequest.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          store.put(buffer, fileName);
        };
      } catch (error) {
        console.error("Failed to auto-download Core.db:", error);
      }
    };

    ensureDatabaseDownloaded();
  }, []);

  return (
    <Layout>
      <div className="flex flex-row justify-center gap-3 w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex-1">
          <Link to="/Al-Quran">
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