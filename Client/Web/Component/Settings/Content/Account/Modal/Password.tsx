import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/Integration/supabase/client";
import { toast } from "sonner";
import { Button } from "@Web/Component/UI/Button";
import { Input } from "@Web/Component/UI/Input";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@Web/Component/UI/Dialog";

interface PasswordStepProps {
  onComplete: () => void;
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted/30 border-2 border-black dark:border-white rounded-[40px] pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PasswordStep({ onComplete }: PasswordStepProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-base">Set new password</DialogTitle>
        </div>
        <DialogDescription className="text-xs">
          Choose a strong password with at least 8 characters.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <PasswordInput
          value={newPassword}
          onChange={setNewPassword}
          placeholder="New password"
        />
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm new password"
        />
        <Button
          onClick={handleUpdate}
          disabled={isSubmitting || !newPassword || !confirmPassword}
          className="w-full"
        >
          {isSubmitting ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </>
  );
}