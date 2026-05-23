import { Toaster } from "@/Top/Component/UI/Toaster";
import { Toaster as Sonner } from "@/Top/Component/UI/Sonner";
import { TooltipProvider } from "@/Top/Component/UI/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/Middle/Context/App";
import { AudioProvider } from "@/Middle/Context/Audio";
import { AuthProvider } from "@/Middle/Context/Auth";
import { ErrorBoundary } from "@/Top/Component/Error-Boundary";

import Index from "@/Top/Page/Index";

// Quran
import Quran        from "@/Top/Page/Quran/Index";
import Surah        from "@/Top/Page/Quran/Surah/Index";
import JuzIndex     from "@/Top/Page/Quran/Juz";
import HizbIndex    from "@/Top/Page/Quran/Hizb";
import AyahIndex    from "@/Top/Page/Quran/Surah/Ayah/Index";
import KalimaIndex  from "@/Top/Page/Quran/Surah/Ayah/Kalima/Index";
import QuranGoals   from "@/Top/Page/Quran/Goal";
import QuranPage    from "@/Top/Page/Quran/Safhah";

// Hadith
import Collection   from "@/Top/Page/Hadith/Collection";
import Chapter      from "@/Top/Page/Hadith/Chapter";
import Narration    from "@/Top/Page/Hadith/Narration";
import Detail       from "@/Top/Page/Hadith/Detail";

// Aid
import Aid              from "@/Top/Page/Aid/Index";
import Dua              from "@/Top/Page/Aid/Dua/Index";
import Dua_Category     from "@/Top/Page/Aid/Dua/Category";
import AlphabetIndex    from "@/Top/Page/Aid/Alphabet/Index";
import AlphabetDetail   from "@/Top/Page/Aid/Alphabet/Detail";
import Tajweed          from "@/Top/Page/Aid/Tajweed/Main";
import TajweedCategory  from "@/Top/Page/Aid/Tajweed/Category";
import TajweedRule      from "@/Top/Page/Aid/Tajweed/Rule";
import PrayerTimes      from "@/Top/Page/Aid/Prayer-Times";
import QiblaPage        from "@/Top/Page/Aid/Qibla";
import HijriCalendar    from "@/Top/Page/Aid/Hijri-Calendar";
import ZakatCalculator  from "@/Top/Page/Aid/Zakat-Calculator";
import TajweedLevel     from "@/Top/Page/Aid/Tajweed/Level";
import TasbihCounter    from "@/Top/Page/Aid/Tasbih-Counter";

// General
import Feedback       from "@/Top/Page/Feedback";
import SignIn         from "@/Top/Page/Auth/Sign-In";
import SignUp         from "@/Top/Page/Auth/Sign-Up";
import ForgotPassword from "@/Top/Page/Auth/Forgot-Password";
import SearchResults  from "@/Top/Page/Search";
import Not_Found      from "@/Top/Page/404";

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
          <AppProvider>
            <AudioProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
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
                  <Route path="/Aid/Alphabet" element={<AlphabetIndex />} />
                  <Route path="/Aid/Alphabet/:letterId" element={<AlphabetDetail />} />
                  
                  {/* Tajweed dynamic routes */}
                  <Route path="/Aid/Tajweed" element={<Tajweed />} />
                  <Route path="/Aid/Tajweed/:categoryId" element={<TajweedCategory />} />
                  <Route path="/Aid/Tajweed/:categoryId/:level1" element={<TajweedLevel />} />
                  <Route path="/Aid/Tajweed/:categoryId/:level1/:level2" element={<TajweedLevel />} />
                  
                  <Route path="/Aid/Tasbih" element={<TasbihCounter />} />
                  <Route path="/Aid/Prayers" element={<PrayerTimes />} />
                  <Route path="/Aid/Qibla" element={<QiblaPage />} />
                  <Route path="/Aid/Hijri-Calendar" element={<HijriCalendar />} />
                  <Route path="/Aid/Zakat-Calculator" element={<ZakatCalculator />} />

                  {/* General */}
                  <Route path="/Feedback" element={<Feedback />} />
                  <Route path="/Sign-In" element={<SignIn />} />
                  <Route path="/Sign-Up" element={<SignUp />} />
                  <Route path="/Forgot-Password" element={<ForgotPassword />} />
                  <Route path="/Search" element={<SearchResults />} />
                  <Route path="*" element={<Not_Found />} />
                </Routes>
              </TooltipProvider>
            </AudioProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;