import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getTajweedCategoryDetail } from "@/Bottom/API/Aid";
import { Button } from "@/Top/Component/UI/Button";

export default function TajweedCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = getTajweedCategoryDetail(categoryId || "");

  if (!category) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-muted-foreground">Category not found</p>
          <Link to="/Aid/Tajweed">
            <Button variant="outline" className="font-bold">
              Back to Tajweed
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {category.hasSubfolders ? (
        <div className="space-y-3">
          {category.subfolders.map((folder) => (
            <Link key={folder.id} to={`/Aid/Tajweed/${category.id}/${folder.id}`} className="block">
              <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                <h3 className="font-semibold">{folder.name}</h3>
              </Button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {category.subcategories.map((sub) => (
            <Link key={sub.id} to={`/Aid/Tajweed/${category.id}/${sub.id}`} className="block">
              <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1 flex-wrap">
                    <span className="font-semibold whitespace-nowrap">{sub.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">–</span>
                    <span className="text-sm text-muted-foreground whitespace-normal break-words">
                      {sub.description}
                    </span>
                  </div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}