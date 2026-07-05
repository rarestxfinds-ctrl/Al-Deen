import { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/Integration/supabase/client";
import { toast } from "sonner";
import { Button } from "@/Component/UI/Button";
import { Input } from "@/Component/UI/Input";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/Component/UI/Dialog";

interface EmailStepProps {
  onComplete: () => void;
}

export function EmailStep({ onComplete }: EmailStepProps) {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (newEmail !== confirmEmail) {
      toast.error("Emails do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Confirmation email sent — check your inbox");
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
          <Mail className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-base">Set new email</DialogTitle>
        </div>
        <DialogDescription className="text-xs">
          A confirmation link will be sent to your new email.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Input
          type="email"
          placeholder="New email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="bg-muted/30 border-2 border-black dark:border-white rounded-[40px]"
        />
        <Input
          type="email"
          placeholder="Confirm new email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          className="bg-muted/30 border-2 border-black dark:border-white rounded-[40px]"
        />
        <Button
          onClick={handleUpdate}
          disabled={isSubmitting || !newEmail || !confirmEmail}
          className="w-full"
        >
          {isSubmitting ? "Updating…" : "Update Email"}
        </Button>
      </div>
    </>
  );
}