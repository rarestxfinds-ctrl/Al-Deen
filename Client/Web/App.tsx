// @Web/App.tsx

// 1. UI Components (Relative Paths)
import { Toaster } from "./Component/UI/Toaster";
import { Toaster as Sonner } from "./Component/UI/Sonner";
import { TooltipProvider } from "./Component/UI/tooltip";

// 2. Third-Party Libraries
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// 3. Context Providers (Relative Paths)
import { AppProvider } from "./Context/App";
import { AudioProvider } from "./Context/Audio";
import { AuthProvider } from "./Context/Auth";
import { AdminProvider } from "./Context/Admin";

// 4. General Components (Relative Paths)
import { ErrorBoundary } from "./Component/Error-Boundary";
import { VisitTracker } from "./Component/Admin/Visit-Tracker";
import Index from "./Page/Index";

// 5. Pages - Quran (Relative Paths)
import Quran        from "./Page/Quran/Index";
import Surah        from "./Page/Quran/Surah/Index";
import JuzIndex     from "./Page/Quran/Juz";
import HizbIndex    from "./Page/Quran/Hizb";
import Ayah    from "./Page/Quran/Surah/Ayah/Index";
import Kalima  from "./Page/Quran/Surah/Ayah/Kalima/Index";
import QuranGoals   from "./Page/Quran/Goal";
import QuranPage    from "./Page/Quran/Safhah";

// 6. Pages - Hadith (Relative Paths)
import HadithIndex   from "./Page/Hadith/Index";
import Collection      from "./Page/Hadith/Collection";
import Chapter    from "./Page/Hadith/Chapter";
import Narration       from "./Page/Hadith/Narration";

// 7. Pages - Aid (Relative Paths)
import Aid                   from "./Page/Aid/Index";
import Dua                   from "./Page/Aid/Dua/Index";
import Dua_Category          from "./Page/Aid/Dua/Category";
import AlphabetIndex         from "./Page/Aid/Arabic/Alphabet/Index";
import AlphabetDetail        from "./Page/Aid/Arabic/Alphabet/Detail";
import TajweedIndex          from "./Page/Aid/Arabic/Tajweed/Index";
import TajweedCategory       from "./Page/Aid/Arabic/Tajweed/Category";
import TajweedSubcategory    from "./Page/Aid/Arabic/Tajweed/Subcategory";
import TajweedDetail         from "./Page/Aid/Arabic/Tajweed/Detail";
import PrayerTimes           from "./Page/Aid/Prayer-Times";
import QiblaPage             from "./Page/Aid/Qibla";
import HijriCalendar         from "./Page/Aid/Hijri-Calendar";
import MasjidFinder          from "./Page/Aid/Masjid-Finder";
import HajjUmrahGuide        from "./Page/Aid/Hajj-Umrah-Guide";
import ZakatCalculator       from "./Page/Aid/Zakat-Calculator";
import InheritanceCalculator from "./Page/Aid/Inheritance-Calculator";
import IslamicWill           from "./Page/Aid/Islamic-Will";
import Ummah                 from "./Page/Aid/Ummah";
import GamesIndex            from "./Page/Aid/Games/Index";
import GuessWhatIndex        from "./Page/Aid/Games/Guess-What/Index";
import GuessSurah            from "./Page/Aid/Games/Guess-What/Surah";
import GuessProphet          from "./Page/Aid/Games/Guess-What/Prophet";
import TasbihCounter         from "./Page/Aid/Tasbih-Counter";
import ArabicIndex           from "./Page/Aid/Arabic/Index";
import ArabicCategory        from "./Page/Aid/Arabic/Category";
import ArabicSubcategory     from "./Page/Aid/Arabic/Subcategory";
import ArabicSubSubcategory  from "./Page/Aid/Arabic/Sub-subcategory";
import ArabicWordPage        from "./Page/Aid/Arabic/Word";
import AIAssistant           from "./Page/Aid/AI";
import Names                 from "./Page/Aid/Names";
import Namaz                 from "./Page/Aid/Namaz";
import FeelingIndex          from "./Page/Aid/Feeling/Index";
import FeelingDetail         from "./Page/Aid/Feeling/Detail";
import ProphetsIndex         from "./Page/Aid/Prophets/Index";
import ProphetDetail         from "./Page/Aid/Prophets/Detail";
import PillarsIndex          from "./Page/Aid/Pillars/Index";
import PillarDetail          from "./Page/Aid/Pillars/Detail";
import ArticlesIndex         from "./Page/Aid/Articles/Index";
import ArticleDetail         from "./Page/Aid/Articles/Detail";
import Schools               from "./Page/Aid/Schools-AND-Branches/Index";
import Branch                from "./Page/Aid/Schools-AND-Branches/Branch";
import Branch_Detail         from "./Page/Aid/Schools-AND-Branches/Detail";
import QA                    from "./Page/Aid/QA";
import QADetail              from "./Page/Aid/QADetail";

import Feedback       from "./Page/Feedback";
import Donate         from "./Page/Donate";
import SignIn         from "./Page/Auth/Sign-In";
import SignUp         from "./Page/Auth/Sign-Up";
import ForgotPassword from "./Page/Auth/Forgot-Password";
import SearchResults  from "./Page/Search";
import Not_Found      from "./Page/404";

import AdminLogin     from "./Page/Admin/Login";
import AdminDashboard from "./Page/Admin/Dashboard";
import Kalimah from "./Page/Quran/Surah/Ayah/Kalima/Index";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AdminProvider>
          <AppProvider>
            <AudioProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <VisitTracker />
                <Routes>
                  <Route path="/" element={<Index />} />

                  {/* Quran -> Quran with Surah */}
                  <Route path="/Quran" element={<Quran />} />
                  <Route path="/Quran/Surah/:id" element={<Surah />} />
                  <Route path="/Quran/Surah/:id/Ayah/:verseId" element={<Ayah />} />
                  <Route path="/Quran/Surah/:id/Ayah/:verseId/Kalima/:kalimaId" element={<Kalimah />} />
                  <Route path="/Quran/Juz/:id" element={<JuzIndex />} />
                  <Route path="/Quran/Hizb/:id" element={<HizbIndex />} />
                  <Route path="/Quran/Page/:id" element={<QuranPage />} />
                  <Route path="/Quran/Goal" element={<QuranGoals />} />

                  {/* Hadith */}
                  <Route path="/Hadith" element={<HadithIndex />} />
                  <Route path="/Hadith/:Collection" element={<Collection />} />
                  <Route path="/Hadith/:Collection/:Chapter" element={<Chapter />} />
                  <Route path="/Hadith/:Collection/:Chapter/:HadithId" element={<Narration />} />

                  {/* Aid */}
                  <Route path="/Aid" element={<Aid />} />
                  <Route path="/Aid/Dua" element={<Dua />} />
                  <Route path="/Aid/Dua/:categoryId" element={<Dua_Category />} />
                  <Route path="/Aid/Arabic/Alphabet" element={<AlphabetIndex />} />
                  <Route path="/Aid/Arabic/Alphabet/:letterId" element={<AlphabetDetail />} />
                  
                  {/* Tajweed dynamic routes */}
                  <Route path="/Aid/Arabic/Tajweed"                                            element={<TajweedIndex />} />
                  <Route path="/Aid/Arabic/Tajweed/:categoryId"                                element={<TajweedCategory />} />
                  <Route path="/Aid/Arabic/Tajweed/:categoryId/:subcategoryId"                 element={<TajweedSubcategory />} />
                  <Route path="/Aid/Arabic/Tajweed/:categoryId/:subcategoryId/:subSubId"       element={<TajweedDetail />} />
                  
                  <Route path="/Aid/Tasbih" element={<TasbihCounter />} />
                  <Route path="/Aid/Prayers" element={<PrayerTimes />} />
                  <Route path="/Aid/Qibla" element={<QiblaPage />} />
                  <Route path="/Aid/Hijri-Calendar" element={<HijriCalendar />} />
                  <Route path="/Aid/Masjid-Finder" element={<MasjidFinder />} />
                  <Route path="/Aid/Hajj-Umrah-Guide" element={<HajjUmrahGuide />} />
                  <Route path="/Aid/Zakat-Calculator" element={<ZakatCalculator />} />
                  <Route path="/Aid/Inheritance-Calculator" element={<InheritanceCalculator />} />
                  <Route path="/Aid/Islamic-Will" element={<IslamicWill />} />
                  <Route path="/Aid/Ummah" element={<Ummah />} />
                  <Route path="/Aid/Games" element={<GamesIndex />} />
                  <Route path="/Aid/Games/Guess-What" element={<GuessWhatIndex />} />
                  <Route path="/Aid/Games/Guess-What/Surah" element={<GuessSurah />} />
                  <Route path="/Aid/Games/Guess-What/Prophet" element={<GuessProphet />} />

                  {/* Arabic vocabulary */}
                  <Route path="/Aid/Arabic"                                              element={<ArabicIndex />} />
                  <Route path="/Aid/Arabic/:vocabId"                                     element={<ArabicCategory />} />
                  <Route path="/Aid/Arabic/:vocabId/:categoryId"                         element={<ArabicSubcategory />} />
                  <Route path="/Aid/Arabic/:vocabId/:categoryId/:subId"                  element={<ArabicSubSubcategory />} />
                  <Route path="/Aid/Arabic/:vocabId/:categoryId/:subId/:wordId"          element={<ArabicWordPage />} />
                  <Route path="/Aid/AI" element={<AIAssistant />} />
                  <Route path="/Aid/Names" element={<Names />} />
                  <Route path="/Aid/Namaz" element={<Namaz />} />
                  <Route path="/Aid/Feeling" element={<FeelingIndex />} />
                  <Route path="/Aid/Feeling/:feeling" element={<FeelingDetail />} />
                  <Route path="/Aid/Prophets" element={<ProphetsIndex />} />
                  <Route path="/Aid/Prophets/:name" element={<ProphetDetail />} />
                  <Route path="/Aid/Pillars" element={<PillarsIndex />} />
                  <Route path="/Aid/Pillars/:id" element={<PillarDetail />} />
                  <Route path="/Aid/Articles" element={<ArticlesIndex />} />
                  <Route path="/Aid/Articles/:id" element={<ArticleDetail />} />
                  <Route path="/Aid/Schools" element={<Schools />} />
                  <Route path="/Aid/Schools/:branch" element={<Branch />} />
                  <Route path="/Aid/Schools/:branch/:detail" element={<Branch_Detail />} />
                  <Route path="/Aid/Q-and-A" element={<QA />} />
                  <Route path="/Aid/Q-and-A/:id" element={<QADetail />} />

                  {/* General */}
                  <Route path="/Feedback" element={<Feedback />} />
                  <Route path="/Donate" element={<Donate />} />
                  <Route path="/Sign-In" element={<SignIn />} />
                  <Route path="/Sign-Up" element={<SignUp />} />
                  <Route path="/Forgot-Password" element={<ForgotPassword />} />
                  <Route path="/Search" element={<SearchResults />} />

                  {/* Admin */}
                  <Route path="/Admin" element={<AdminDashboard />} />
                  <Route path="/Admin/Login" element={<AdminLogin />} />

                  <Route path="*" element={<Not_Found />} />
                </Routes>
              </TooltipProvider>
            </AudioProvider>
          </AppProvider>
          </AdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;