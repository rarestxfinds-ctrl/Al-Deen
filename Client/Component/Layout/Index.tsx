import { ReactNode, lazy, Suspense, useState, useEffect } from "react";
import { Header } from "Client/Component/Layout/Header/Index.tsx";
import { PageTransition } from "Client/Component/Page-Transition";
import { cn } from "Client/Library/utils";

const SettingsSidebar = lazy(() => import("Client/Component/Settings/Index").then(module => ({ default: module.SettingsSidebar })));
const SpotlightSearch = lazy(() => import("Client/Component/Search/Index"));

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter = false }: LayoutProps) {
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    // Custom event handlers to toggle visibility dynamically
    const handleHide = () => setShowHeader(false);
    const handleShow = () => setShowHeader(true);

    window.addEventListener("hide-header", handleHide);
    window.addEventListener("show-header", handleShow);

    return () => {
      window.removeEventListener("hide-header", handleHide);
      window.removeEventListener("show-header", handleShow);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Conditionally render the header based on received global layout events */}
      {showHeader && <Header />}
      
      <PageTransition>
        {/* Dynamic padding adjustment when the header is hidden 
            to prevent layout content shifts or giant white spaces */}
        <main className={cn(
          "flex-1 px-2 sm:px-4 pb-6 transition-all duration-150", 
          showHeader ? "pt-12 md:pt-16" : "pt-0"
        )}>
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