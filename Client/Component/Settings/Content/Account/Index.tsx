// Component/Settings/Content/Account/Index.tsx
import { useState } from "react";
import { Button } from "Client/Component/UI/Button";
import { Container } from "Client/Component/UI/Container";
import { useApp } from "Client/Context/App";
import { useBookmarks } from "Client/Hook/Use-Bookmarks";
import { useReadingProgress } from "Client/Hook/Use-Reading-Progress";
import { useNotes } from "Client/Hook/Use-Notes";
import { surahList } from "Server/API/Quran";
import { supabase } from "Client/Integration/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";
import { CredentialModal } from "./Modal/Index";
import { ProfileTab } from "./Tab/Profile";
import { BookmarksTab } from "./Tab/Bookmark";
import { NotesTab } from "./Tab/Note";
import { HistoryTab } from "./Tab/History";
import type { CredentialModalType, AccountSubcategory } from "./Types";

// ... rest of the component
interface AccountSectionProps {
  user: any;
  displayName: string;
  initials: string;
  handleSignOut: () => void;
  navigate: (path: string) => void;
  setSettingsSidebarOpen: (open: boolean) => void;
  activeSubcategory: AccountSubcategory;
}

export function AccountSection({
  user,
  displayName,
  initials,
  handleSignOut,
  navigate,
  setSettingsSidebarOpen,
  activeSubcategory,
}: AccountSectionProps) {
  const { bookmarks, isLoading: bookmarksLoading, removeBookmark } = useBookmarks();
  const { progress } = useReadingProgress();
  const { notes, isLoading: notesLoading, deleteNote } = useNotes();
  const {
    setTheme, setQuranFont, setFontSize, setTranslationFontSize,
    setHoverTranslation, setHoverRecitation,
    setInlineTranslation, setVerseTranslation,
    setSelectedTranslations, setCurrentLanguage, setShowArabicText,
  } = useApp();

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeModal, setActiveModal] = useState<CredentialModalType>(null);

  if (!user) {
    return (
      <Container className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Sign in to access your account.</p>
        <Button onClick={() => { navigate("/Sign-In"); setSettingsSidebarOpen(false); }}>
          Sign In
        </Button>
      </Container>
    );
  }

  const continueReadingSurah = progress
    ? surahList.find((s) => s.id === progress.last_surah_id)
    : null;

  const handleResetSettings = () => {
    setTheme("auto");
    setQuranFont("uthmani");
    setFontSize(5);
    setTranslationFontSize(3);
    setHoverTranslation(true);
    setHoverRecitation(true);
    setInlineTranslation(false);
    setVerseTranslation(true);
    setSelectedTranslations(["translation"]);
    setCurrentLanguage("en");
    setShowArabicText(true);
    toast.success("Settings reset to defaults");
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await Promise.all([
        supabase.from("bookmarks").delete().eq("user_id", user.id),
        supabase.from("notes").delete().eq("user_id", user.id),
        supabase.from("reading_progress").delete().eq("user_id", user.id),
        supabase.from("goal_progress").delete().eq("user_id", user.id),
        supabase.from("quran_goals").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("user_id", user.id),
      ]);
      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      setSettingsSidebarOpen(false);
      navigate("/");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const renderActiveContent = () => {
    switch (activeSubcategory) {
      case "profile":
        return (
          <ProfileTab
            navigate={navigate}
            setSettingsSidebarOpen={setSettingsSidebarOpen}
            onOpenModal={setActiveModal}
            onResetSettings={handleResetSettings}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
            isDeletingAccount={isDeletingAccount}
          />
        );
      case "bookmarks":
        return (
          <BookmarksTab
            bookmarks={bookmarks}
            isLoading={bookmarksLoading}
            removeBookmark={removeBookmark}
            setSettingsSidebarOpen={setSettingsSidebarOpen}
          />
        );
      case "notes":
        return (
          <NotesTab
            notes={notes}
            isLoading={notesLoading}
            deleteNote={deleteNote}
            setSettingsSidebarOpen={setSettingsSidebarOpen}
          />
        );
      case "history":
        return (
          <HistoryTab
            continueReadingSurah={continueReadingSurah}
            progress={progress}
            setSettingsSidebarOpen={setSettingsSidebarOpen}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Modals */}
      <CredentialModal
        open={activeModal === "password"}
        onClose={() => setActiveModal(null)}
        type="password"
        userEmail={user.email}
      />
      <CredentialModal
        open={activeModal === "email"}
        onClose={() => setActiveModal(null)}
        type="email"
        userEmail={user.email}
      />

      {/* Profile Card - responsive padding */}
      <Container className="!p-3 md:!p-4 flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm md:text-base">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-sm md:text-base">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </Container>

      {/* Active subcategory content */}
      {renderActiveContent()}
    </div>
  );
}