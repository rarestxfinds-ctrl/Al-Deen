import { lazy, Suspense } from "react";
import { Toaster } from "@/Top/Component/UI/Toaster";
import { Toaster as Sonner } from "@/Top/Component/UI/Sonner";
import { TooltipProvider } from "@/Top/Component/UI/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/Middle/Context/App";
import { AudioProvider } from "@/Middle/Context/Audio";
import { AuthProvider } from "@/Middle/Context/Auth";
import { ErrorBoundary } from "@/Top/Component/Error-Boundary";
import { GridSkeleton } from "@/Top/Component/Skeleton/Content-Skeleton";

import Index from "@/Top/Page/Index";

// Quran
const Quran        = lazy(() => import("@/Top/Page/Quran/Index"));
const Surah        = lazy(() => import("@/Top/Page/Quran/Surah/Index"));
const JuzIndex     = lazy(() => import("@/Top/Page/Quran/Juz"));
const HizbIndex    = lazy(() => import("@/Top/Page/Quran/Hizb"));
const AyahIndex    = lazy(() => import("@/Top/Page/Quran/Surah/Ayah/Index"));
const KalimaIndex  = lazy(() => import("@/Top/Page/Quran/Surah/Ayah/Kalima/Index"));
const QuranGoals   = lazy(() => import("@/Top/Page/Quran/Goal"));
const QuranPage    = lazy(() => import("@/Top/Page/Quran/Safhah"));

// Hadith
const Collection            = lazy(() => import("@/Top/Page/Hadith/Collection"));
const Chapter = lazy(() => import("@/Top/Page/Hadith/Chapter"));
const Narration    = lazy(() => import("@/Top/Page/Hadith/Narration"));
const Detail     = lazy(() => import("@/Top/Page/Hadith/Detail"));

// Aid
const Aid              = lazy(() => import("@/Top/Page/Aid/Index"));
const Dua              = lazy(() => import("@/Top/Page/Aid/Dua/Index"));
const Dua_Category     = lazy(() => import("@/Top/Page/Aid/Dua/Category"));
const AlphabetIndex    = lazy(() => import("@/Top/Page/Aid/Alphabet/Index"));
const AlphabetDetail   = lazy(() => import("@/Top/Page/Aid/Alphabet/Detail"));
const Tajweed          = lazy(() => import("@/Top/Page/Aid/Tajweed/Main"));
const TajweedCategory  = lazy(() => import("@/Top/Page/Aid/Tajweed/Category"));
const TajweedRule      = lazy(() => import("@/Top/Page/Aid/Tajweed/Rule"));
const PrayerTimes      = lazy(() => import("@/Top/Page/Aid/Prayer-Times"));
const QiblaPage        = lazy(() => import("@/Top/Page/Aid/Qibla"));
const HijriCalendar    = lazy(() => import("@/Top/Page/Aid/Hijri-Calendar"));
const ZakatCalculator  = lazy(() => import("@/Top/Page/Aid/Zakat-Calculator"));
const TajweedLevel     = lazy(() => import("@/Top/Page/Aid/Tajweed/Level")); // new resolver
const TasbihCounter    = lazy(() => import("@/Top/Page/Aid/Tasbih-Counter"))
// General
const Feedback       = lazy(() => import("@/Top/Page/Feedback"));
const SignIn         = lazy(() => import("@/Top/Page/Auth/Sign-In"));
const SignUp         = lazy(() => import("@/Top/Page/Auth/Sign-Up"));
const ForgotPassword = lazy(() => import("@/Top/Page/Auth/Forgot-Password"));
const SearchResults  = lazy(() => import("@/Top/Page/Search"));
const Not_Found      = lazy(() => import("@/Top/Page/404"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function LazyFallback() {
  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24">
      <div className="container max-w-4xl">
        <GridSkeleton count={6} />
      </div>
    </div>
  );
}

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
                <Suspense fallback={<LazyFallback />}>
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
                </Suspense>
              </TooltipProvider>
            </AudioProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;