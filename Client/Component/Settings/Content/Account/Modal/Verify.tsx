import { useState } from "react";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "Client/Integration/supabase/client";
import { toast } from "sonner";
import { Button } from "Client/Component/UI/Button";
import { Input } from "Client/Component/UI/Input";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "Client/Component/UI/Dialog";

interface VerifyStepProps {
  userEmail: string;
  onVerified: () => void;
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

export function VerifyStep({ userEmail, onVerified }: VerifyStepProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!currentPassword) return;
    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (error) throw error;
      onVerified();
    } catch {
      toast.error("Incorrect password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <DialogHeader className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-base">Confirm your identity</DialogTitle>
        </div>
        <DialogDescription className="text-xs">
          Enter your current password to continue.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <PasswordInput
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Current password"
        />
        <Button
          onClick={handleVerify}
          disabled={isVerifying || !currentPassword}
          className="w-full gap-2"
        >
          {isVerifying ? "Verifying…" : <>Continue <ArrowRight className="h-3.5 w-3.5" /></>}
        </Button>
      </div>
    </>
  );
}