import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";

import { Fetch_Collections } from "@/Library/Hadith-API";
import type { Collection_Info } from "@/Library/Hadith-Types";

const HadithIndex = () => {
  const { data: collections = [] } = useQuery<Collection_Info[]>({
    queryKey: ["hadithCollections"],
    queryFn: () => Fetch_Collections(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {collections.map((col: Collection_Info, index: number) => {
          // Format collection ID to replace slashes with hyphens (e.g., "Sahih/Muslim" -> "Sahih-Muslim")
          const safeCollectionId = col.ID.replace(/\//g, "-");

          return (
            <Link key={col.ID} to={`/Hadith/${safeCollectionId}`}>
              <Card className="p-4 transition-all group cursor-pointer">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  {/* Number index identifier */}
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {index + 1}
                  </span>

                  {/* Name of the collection */}
                  <p className="font-semibold text-sm truncate group-hover:text-foreground">
                    {col.Name}
                  </p>

                  {/* Category metadata */}
                  <div className="text-right flex flex-col justify-center">
                    {col.Category && (
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">
                        {col.Category}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
};

export default HadithIndex;