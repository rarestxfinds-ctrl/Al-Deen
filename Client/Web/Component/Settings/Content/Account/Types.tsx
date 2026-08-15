// Component/Settings/Content/Account/Types.tsx
import { ReactNode } from "react";

export type AccountSubcategory = "profile" | "bookmarks" | "notes" | "history";
export type CredentialModalType = "password" | "email" | null;

export interface AccountTabConfig {
  id: AccountSubcategory;
  icon: ReactNode;
  label: string;
}

export interface AccountSectionProps {
  user: any;
  displayName: string;
  initials: string;
  handleSignOut: () => void;
  navigate: (path: string) => void;
  setSettingsSidebarOpen: (open: boolean) => void;
  activeSubcategory: AccountSubcategory;
}