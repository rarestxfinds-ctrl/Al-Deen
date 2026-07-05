import { Separator } from "@/Component/UI/Separator";
import { Button } from "@/Component/UI/Button";
import { Container } from "@/Component/UI/Container";
import { Target, ChevronRight, KeyRound, Mail, RotateCcw, LogOut, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/Component/UI/Alert-Dialog";
import type { CredentialModalType } from "../Types";

interface ProfileTabProps {
  navigate: (path: string) => void;
  setSettingsSidebarOpen: (open: boolean) => void;
  onOpenModal: (type: CredentialModalType) => void;
  onResetSettings: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}

export function ProfileTab({
  navigate,
  setSettingsSidebarOpen,
  onOpenModal,
  onResetSettings,
  onSignOut,
  onDeleteAccount,
  isDeletingAccount,
}: ProfileTabProps) {
  return (
    <div className="space-y-3">
      {/* Learning Plans */}
      <Container className="!p-0 overflow-hidden group">
        <Button
          onClick={() => { navigate("/Quran/Goal"); setSettingsSidebarOpen(false); }}
          className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4"
          variant="secondary"
          fullWidth
        >
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">My Learning Plans</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </Container>

      <Separator />

      {/* Credentials group */}
      <div className="space-y-2">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Account credentials</p>
        </div>

        <Container className="!p-0 overflow-hidden group">
          <Button
            onClick={() => onOpenModal("password")}
            className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4"
            variant="secondary"
            fullWidth
          >
            <div className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Update Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </Container>

        <Container className="!p-0 overflow-hidden group">
          <Button
            onClick={() => onOpenModal("email")}
            className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4"
            variant="secondary"
            fullWidth
          >
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Update Email</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </Container>
      </div>

      <Separator />

      {/* General */}
      <Container className="!p-0 overflow-hidden group">
        <Button
          onClick={onResetSettings}
          className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4"
          variant="secondary"
          fullWidth
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Reset Settings</span>
          </div>
        </Button>
      </Container>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-2">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Danger zone</p>
        </div>

        <Container className="!p-0 overflow-hidden group">
          <Button
            onClick={onSignOut}
            className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4 text-destructive hover:text-destructive"
            variant="secondary"
            fullWidth
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </div>
          </Button>
        </Container>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Container className="!p-0 overflow-hidden group cursor-pointer">
              <Button
                className="w-full flex items-center justify-between gap-3 h-auto py-3 px-4 text-destructive/70 hover:text-destructive"
                variant="secondary"
                fullWidth
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Delete Account</span>
                </div>
              </Button>
            </Container>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-[40px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and
                remove all your data including bookmarks, notes, and reading progress.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-[40px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteAccount}
                disabled={isDeletingAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[40px]"
              >
                {isDeletingAccount ? "Deleting…" : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}