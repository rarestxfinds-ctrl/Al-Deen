import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";
import NotFound from "../404";

import { Fetch_Collections, Get_Chapter } from "@/Library/Hadith-API";
import type { Collection_Info, Chapter_Data, Narration as NarrationType } from "@/Library/Hadith-Types";

const Chapter = () => {
  const { Collection, Chapter } = useParams<{ Collection: string; Chapter: string }>();

  const collectionId = Collection ?? "";
  const chapterIdNum = Number(Chapter) || 0;

  // 1. Resolve collection metadata to match Collection ID
  const { data: collections = [] } = useQuery<Collection_Info[]>({
    queryKey: ["hadithCollections"],
    queryFn: () => Fetch_Collections(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Normalize slug comparisons so "Sahih-Muslim" matches "Sahih/Muslim"
  const normalize = (str?: string) => str?.toLowerCase().replace(/[\/-]/g, "");

  const targetCollection = collections.find(
    (c) => normalize(c.ID) === normalize(collectionId)
  );

  // 2. Fetch chapter data (including its Narrations list)
  const { data: chapterData = null } = useQuery<Chapter_Data | null>({
    queryKey: ["hadithChapter", targetCollection?.ID, chapterIdNum],
    queryFn: () => (targetCollection?.ID && chapterIdNum ? Get_Chapter(targetCollection.ID, chapterIdNum) : null),
    enabled: Boolean(targetCollection?.ID && chapterIdNum),
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  if (!targetCollection || !chapterData || !chapterData.Narrations) {
    return <NotFound />;
  }

  const safeCollectionId = targetCollection.ID.replace(/\//g, "-");

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {chapterData.Narrations.map((narration: NarrationType) => (
          <Link
            key={narration.ID}
            to={`/Hadith/${safeCollectionId}/${chapterIdNum}/${narration.ID}`}
          >
            <Button
              variant="outline"
              className="w-full h-16 text-lg font-semibold"
            >
              {narration.ID}
            </Button>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Chapter;