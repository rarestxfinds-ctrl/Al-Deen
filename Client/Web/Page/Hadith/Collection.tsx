import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { useTranslation } from "@/Hook/Use-Translation";

import { Fetch_Collections, Get_Chapters } from "@/Library/Hadith-API";
import type { Collection_Info, Chapter as ChapterType } from "@/Library/Hadith-Types";

const Collection = () => {
  const { Collection } = useParams<{ Collection: string }>();
  const { t } = useTranslation();

  // 1. Fetch collection info to resolve Collection ID & Metadata
  const { data: collections = [] } = useQuery<Collection_Info[]>({
    queryKey: ["hadithCollections"],
    queryFn: () => Fetch_Collections(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Normalize slug comparisons so "Sahih-Muslim" matches "Sahih/Muslim" or "Sahih-Muslim"
  const normalize = (str?: string) => str?.toLowerCase().replace(/[\/-]/g, "");

  const targetCollection = collections.find(
    (c) => normalize(c.ID) === normalize(Collection)
  );

  // 2. Fetch chapters for the specific collection using Get_Chapters
  const { data: chapters = [] } = useQuery<ChapterType[] | null>({
    queryKey: ["hadithChapters", targetCollection?.ID],
    queryFn: () => (targetCollection?.ID ? Get_Chapters(targetCollection.ID) : null),
    enabled: Boolean(targetCollection?.ID),
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  if (!targetCollection || !chapters) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Card className="max-w-md mx-auto p-8">
            <h1 className="text-2xl font-semibold mb-4">Collection Not Found</h1>
            <Link to="/Hadith">
              <Button>
                {t.common.back} to {t.hadith.title}
              </Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  const safeCollectionId = targetCollection.ID.replace(/\//g, "-");

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chapters.map((chapter: ChapterType, index: number) => (
          <Link
            key={chapter.ID}
            to={`/Hadith/${safeCollectionId}/${chapter.ID}`}
          >
            <Card className="p-4 transition-all group">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {index + 1}
                </span>
                <p className="font-semibold text-sm truncate group-hover:text-foreground">
                  {chapter.Name}
                </p>
                <div className="text-right flex flex-col justify-center">
                  {chapter.Hadith_Count > 0 && (
                    <span className="text-xs text-muted-foreground group-hover:text-foreground">
                      {chapter.Hadith_Count} Hadiths
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Collection;