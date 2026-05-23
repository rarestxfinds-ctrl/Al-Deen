import { Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getLetters } from "@/Bottom/API/Aid";
import { Button } from "@/Top/Component/UI/Button";

const AlphabetIndex = () => {
  const letters = getLetters();

  return (
    <Layout>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 justify-items-center">
        {letters.map((letter, index) => (
          <Link
            key={letter.id}
            to={`/Aid/Alphabet/${index + 1}`}
            className="w-full aspect-square max-w-[80px]"
          >
            <Button
              variant="ghost"
              className="w-full h-full rounded-full p-0"
            >
              <span className="font-arabic text-2xl" dir="rtl">
                {letter.forms.isolated}
              </span>
            </Button>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default AlphabetIndex;