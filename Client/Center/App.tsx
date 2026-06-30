import { Toaster } from "Client/Component/UI/Toaster";
import { Toaster as Sonner } from "Client/Component/UI/Sonner";
import { TooltipProvider } from "Client/Component/UI/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "Client/Context/App";
import { AudioProvider } from "Client/Context/Audio";
import { AuthProvider } from "Client/Context/Auth";
import { AdminProvider } from "Client/Context/Admin";
import { ErrorBoundary } from "Client/Component/Error-Boundary";
import { VisitTracker } from "Client/Component/Admin/Visit-Tracker";

import Index from "Client/Page/Index";

// Quran
import Quran        from "Client/Page/Quran/Index";
import Surah        from "Client/Page/Quran/Surah/Index";
import JuzIndex     from "Client/Page/Quran/Juz";
import HizbIndex    from "Client/Page/Quran/Hizb";
import AyahIndex    from "Client/Page/Quran/Surah/Ayah/Index";
import KalimaIndex  from "Client/Page/Quran/Surah/Ayah/Kalima/Index";
import QuranGoals   from "Client/Page/Quran/Goal";
import QuranPage    from "Client/Page/Quran/Safhah";

// Hadith
import Collection   from "Client/Page/Hadith/Collection";
import Chapter      from "Client/Page/Hadith/Chapter";
import Narration    from "Client/Page/Hadith/Narration";
import Detail       from "Client/Page/Hadith/Detail";

// Aid
import Aid              from "Client/Page/Aid/Index";
import Dua              from "Client/Page/Aid/Dua/Index";
import Dua_Category     from "Client/Page/Aid/Dua/Category";
import AlphabetIndex from "Client/Page/Aid/Arabic/Alphabet/Index"
import AlphabetDetail   from "Client/Page/Aid/Arabic/Alphabet/Detail";
import TajweedIndex          from "Client/Page/Aid/Arabic/Tajweed/Index";
import TajweedCategory  from "Client/Page/Aid/Arabic/Tajweed/Category";
import TajweedSubcategory     from "Client/Page/Aid/Arabic/Tajweed/Subcategory";
import TajweedDetail    from "Client/Page/Aid/Arabic/Tajweed/Detail"
import PrayerTimes      from "Client/Page/Aid/Prayer-Times";
import QiblaPage        from "Client/Page/Aid/Qibla";
import HijriCalendar    from "Client/Page/Aid/Hijri-Calendar";
import MasjidFinder     from "Client/Page/Aid/Masjid-Finder";
import ZakatCalculator  from "Client/Page/Aid/Zakat-Calculator";
import InheritanceCalculator from "Client/Page/Aid/Inheritance-Calculator";
import IslamicWill from "Client/Page/Aid/Islamic-Will";
import Ummah from "Client/Page/Aid/Ummah";
import GamesIndex from "Client/Page/Aid/Games/Index";
import GuessWhatIndex from "Client/Page/Aid/Games/Guess-What/Index";
import GuessSurah from "Client/Page/Aid/Games/Guess-What/Surah";
import GuessProphet from "Client/Page/Aid/Games/Guess-What/Prophet";
import TasbihCounter    from "Client/Page/Aid/Tasbih-Counter";
import ArabicIndex      from "Client/Page/Aid/Arabic/Index";
import ArabicCategory   from "Client/Page/Aid/Arabic/Category";
import ArabicSubcategory from "Client/Page/Aid/Arabic/Subcategory";
import ArabicSubSubcategory from "Client/Page/Aid/Arabic/Sub-subcategory";
import ArabicWordPage   from "Client/Page/Aid/Arabic/Word";
import AIAssistant       from "Client/Page/Aid/AI";
import Names              from "Client/Page/Aid/Names";
import Namaz              from "Client/Page/Aid/Namaz";
import Feeling            from "Client/Page/Aid/Feeling";
import ProphetsIndex      from "Client/Page/Aid/Prophets/Index";
import ProphetDetail      from "Client/Page/Aid/Prophets/Detail";
import PillarsIndex       from "Client/Page/Aid/Pillars/Index";
import PillarDetail       from "Client/Page/Aid/Pillars/Detail";
import ArticlesIndex      from "Client/Page/Aid/Articles/Index";
import ArticleDetail      from "Client/Page/Aid/Articles/Detail";
import Schools            from "Client/Page/Aid/Schools-AND-Branches/Index";
import Branch            from "Client/Page/Aid/Schools-AND-Branches/Branch";
import Branch_Detail            from "Client/Page/Aid/Schools-AND-Branches/Detail";
import QA                 from "Client/Page/Aid/QA";
import QADetail           from "Client/Page/Aid/QADetail";

// General
import Feedback       from "Client/Page/Feedback";
import Donate         from "Client/Page/Donate";
import SignIn         from "Client/Page/Auth/Sign-In";
import SignUp         from "Client/Page/Auth/Sign-Up";
import ForgotPassword from "Client/Page/Auth/Forgot-Password";
import SearchResults  from "Client/Page/Search";
import Not_Found      from "Client/Page/404";

// Admin
import AdminLogin     from "Client/Page/Admin/Login";
import AdminDashboard from "Client/Page/Admin/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
                {/* No Suspense – all components load synchronously */}
                <Routes>
                  <Route path="/" element={<Index />} />

                  {/* Quran */}
                  <Route path="/Quran" element={<Quran />} />
                  <Route path="/Quran/Surah/:id" element={<Surah />} />
                  <Route path="/Quran/Surah/:id/Ayah/:verseId" element={<AyahIndex />} />
                  <Route path="/Quran/Surah/:id/Ayah/:verseId/Kalima/:kalimaId" element={<KalimaIndex />} />
                  <Route path="/Quran/Juz/:id" element={<JuzIndex />} />
                  <Route path="/Quran/Hizb/:id" element={<HizbIndex />} />
                  <Route path="/Quran/Page/:id" element={<QuranPage />} />
                  <Route path="/Quran/Goal" element={<QuranGoals />} />

                  {/* Hadith */}
                  <Route path="/Hadith" element={<Collection />} />
                  <Route path="/Hadith/:Collection" element={<Chapter />} />
                  <Route path="/Hadith/:Collection/:Chapter/:HadithId" element={<Detail />} />
                  <Route path="/Hadith/:Collection/:Chapter" element={<Narration />} />

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
                  <Route path="/Aid/Feeling" element={<Feeling />} />
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