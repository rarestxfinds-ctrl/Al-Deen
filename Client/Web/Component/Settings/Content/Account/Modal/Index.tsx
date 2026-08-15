import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@Web/Component/UI/Dialog";
import { VerifyStep } from "./Verify";
import { PasswordStep } from "./Password";
import { EmailStep } from "./Email";
import type { CredentialModalProps, ModalStep } from "../Types";

export function CredentialModal({ open, onClose, type, userEmail }: CredentialModalProps) {
  const [step, setStep] = useState<ModalStep>("verify");

  const isPassword = type === "password";

  const resetState = () => {
    setStep("verify");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleVerified = () => {
    setStep("update");
  };

  const handleComplete = () => {
    handleClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-[40px] max-w-sm gap-0 p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 ${
            step === "verify"
              ? "bg-foreground text-background border-foreground"
              : "bg-primary text-primary-foreground border-primary"
          }`}>
            {step === "update" ? "✓" : "1"}
          </div>
          <div className={`h-0.5 flex-1 ${step === "update" ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 ${
            step === "update"
              ? "bg-foreground text-background border-foreground"
              : "bg-muted text-muted-foreground border-muted"
          }`}>
            2
          </div>
        </div>

        {step === "verify" && (
          <VerifyStep userEmail={userEmail} onVerified={handleVerified} />
        )}

        {step === "update" && isPassword && (
          <PasswordStep onComplete={handleComplete} />
        )}

        {step === "update" && !isPassword && (
          <EmailStep onComplete={handleComplete} />
        )}
      </DialogContent>
    </Dialog>
  );
}