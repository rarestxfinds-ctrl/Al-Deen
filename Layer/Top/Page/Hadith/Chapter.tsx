import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { Card } from "@/Top/Component/UI/Card";
import { Button } from "@/Top/Component/UI/Button";
import { getCollection, getChaptersByCollection } from "@/Bottom/API/Hadith";
import { useTranslation } from "@/Middle/Hook/Use-Translation";

const Chapter = () => {
  const { Collection } = useParams<{ Collection: string }>();
  const { t } = useTranslation();

  const collection = Collection ? getCollection(Collection) : null;
  const chapters = Collection ? getChaptersByCollection(Collection) : [];

  if (!collection) {
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

  return (
    <Layout>
      {chapters.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No chapters available yet.</p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-3">
          {chapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              to={`/Hadith/${collection.slug}/${chapter.id}`}
              className="flex-1 min-w-[150px]"
            >
              <Card className="p-4 text-center transition-all hover:scale-[1.01] group">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="sm"
                    className="w-10 h-10 rounded-full p-0 flex items-center justify-center"
                  >
                    {index + 1}
                  </Button>
                  <p className="font-semibold text-sm group-hover:text-white dark:group-hover:text-black">
                    {chapter.name}
                  </p>
                  {chapter.hadithRange && (
                    <Button
                      size="sm"
                      className="px-2 py-0.5 text-xs rounded-full text-muted-foreground h-auto"
                    >
                      {chapter.hadithRange}
                    </Button>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Chapter;