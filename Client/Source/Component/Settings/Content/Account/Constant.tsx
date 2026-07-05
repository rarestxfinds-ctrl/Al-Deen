import { User, Bookmark, FileText, Clock } from "lucide-react";
import type { AccountTabConfig } from "./Types";

export const ACCOUNT_TABS: AccountTabConfig[] = [
  { id: "profile",   icon: <User className="h-3.5 w-3.5" />,     label: "Profile" },
  { id: "bookmarks", icon: <Bookmark className="h-3.5 w-3.5" />,  label: "Bookmarks" },
  { id: "notes",     icon: <FileText className="h-3.5 w-3.5" />,  label: "Notes" },
  { id: "history",   icon: <Clock className="h-3.5 w-3.5" />,     label: "History" },
];