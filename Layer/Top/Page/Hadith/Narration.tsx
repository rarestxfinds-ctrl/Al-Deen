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
      {/* Removed .container, set width to 4xl, and p-0 for mobile flush edges */}
      <div className="max-w-4xl mx-auto p-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 sm:px-0 py-4">
          {hadithIds.map((id) => (
            <Link key={id} to={`/Hadith/${collection.slug}/${Chapter}/${id}`}>
              <Button
                variant="outline"
                className="w-full h-16 text-lg font-semibold hover:scale-105 transition-transform"
              >
                {id}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Narration;