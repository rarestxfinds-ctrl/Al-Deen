import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@Web/Context/App";
import { useAuth } from "@Web/Context/Auth";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { toast } from "sonner";
import { Button } from "@Web/Component/UI/Button";
import { Desktop } from "./Layout/Desktop";
import { Mobile } from "./Layout/Mobile";
import { AccountSection } from "./Content/Account/Index";
import { QuranSection } from "./Content/Quran/Index";
import { HadithSection } from "./Content/Hadith/Index";
import { AidSection } from "./Content/Aid/Index";
import { LanguageSection } from "./Content/Language";
import { ThemeSection } from "./Content/Theme";
import { AccessibilitySection } from "./Content/Accessibility";
import { QURAN_SUBCATEGORIES } from "./Content/Quran/Constant";
import type { SettingsCategory, AccountSubcategory, AidSubcategory, QuranSubcategory, HadithSubcategory } from "./Types";

export function SettingsSidebar({ compact = false }: { compact?: boolean }) {
  const { isSettingsSidebarOpen, setSettingsSidebarOpen } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("account");
  const [activeSubcategory, setActiveSubcategory] = useState<AccountSubcategory | AidSubcategory | QuranSubcategory | null>("profile");

  const handleClose = () => {
    setSettingsSidebarOpen(false);
    setActiveCategory("account");
    setActiveSubcategory("profile");
  };

  const handleCategoryChange = (category: SettingsCategory) => {
    setActiveCategory(category);
    if (category === "account") {
      setActiveSubcategory("profile");
    } else if (category === "aid") {
      setActiveSubcategory("dua");
    } else if (category === "quran") {
      setActiveSubcategory(QURAN_SUBCATEGORIES[0]?.id || "arabic");
    } else {
      setActiveSubcategory(null);
    }
  };

  const handleSubcategoryChange = (subcategory: AccountSubcategory | AidSubcategory | QuranSubcategory | null) => {
    setActiveSubcategory(subcategory);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "account": {
        if (!user) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Please sign in to view account settings.</p>
              <Button onClick={() => navigate("/Sign-In")} className="mt-4">
                Sign In
              </Button>
            </div>
          );
        }
        
        const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
        const initials = displayName.slice(0, 2).toUpperCase();
        const handleSignOut = async () => {
          await signOut();
          toast.success("Signed out successfully");
          setSettingsSidebarOpen(false);
        };
        
        return (
          <AccountSection
            user={user}
            displayName={displayName}
            initials={initials}
            handleSignOut={handleSignOut}
            navigate={navigate}
            setSettingsSidebarOpen={setSettingsSidebarOpen}
            activeSubcategory={activeSubcategory as AccountSubcategory}
          />
        );
      }
      case "quran":
        return <QuranSection activeSubcategory={activeSubcategory as QuranSubcategory} />;
      case "hadith":
        return <HadithSection activeSubcategory={activeSubcategory as AidSubcategory}/>;
      case "aid":
        return <AidSection activeSubcategory={activeSubcategory as AidSubcategory} />;
      case "language":
        return <LanguageSection onSelect={() => {}} />;
      case "theme":
        return <ThemeSection />;
      case "accessibility":
        return <AccessibilitySection />;
      default:
        return null;
    }
  };

  if (!isSettingsSidebarOpen) return null;

  if (isMobile) {
    return (
      <Mobile
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        onCategoryChange={handleCategoryChange}
        onSubcategoryChange={handleSubcategoryChange}
        onClose={handleClose}
      >
        {renderContent()}
      </Mobile>
    );
  }

  return (
    <Desktop
      activeCategory={activeCategory}
      activeSubcategory={activeSubcategory}
      onCategoryChange={handleCategoryChange}
      onSubcategoryChange={handleSubcategoryChange}
    >
      {renderContent()}
    </Desktop>
  );
}