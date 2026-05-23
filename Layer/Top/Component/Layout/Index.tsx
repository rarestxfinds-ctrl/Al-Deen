import { ReactNode, lazy, Suspense } from "react";
import { Header } from "@/Top/Component/Layout/Header";
import { PageTransition } from "@/Top/Component/Page-Transition";

const SettingsSidebar = lazy(() => import("@/Top/Component/Settings/Index").then(module => ({ default: module.SettingsSidebar })));
const SpotlightSearch = lazy(() => import("@/Top/Component/Search/Index"));
interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 pt-12 md:pt-16 px-2 sm:px-4 pb-6">
          {children}
        </main>
      </PageTransition>
      <Suspense fallback={null}>
        <SettingsSidebar />
        <SpotlightSearch />
      </Suspense>
    </div>
  );
}