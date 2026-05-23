import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getCollection, getChapter } from "@/Bottom/API/Hadith";
import { Button } from "@/Top/Component/UI/Button";
import NotFound from "../404";

const Narration = () => {
  const { Collection, Chapter } = useParams<{ Collection: string; Chapter: string }>();

  const collection = Collection ? getCollection(Collection) : null;
  const chapter = Collection && Chapter ? getChapter(Collection, Chapter) : null;

  if (!collection || !chapter) {
    return <NotFound />;
  }

  const hadithIds = chapter.hadith.map(h => h.id);

  return (
    <Layout>
      {/* Full‑width grid, no extra margins or padding */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {hadithIds.map((id) => (
          <Link key={id} to={`/Hadith/${collection.slug}/${Chapter}/${id}`}>
            <Button
              variant="outline"
              className="w-full h-16 text-lg font-semibold"
            >
              {id}
            </Button>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Narration;