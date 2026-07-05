import { useAuth } from "@/Context/Auth";
import { toast } from "@/Hook/Use-Toast";

function notifySignIn(action?: string) {
  toast({
    title: "Sign in required",
    description: action
      ? `Please sign in to ${action}`
      : "Please sign in to use this feature",
    variant: "destructive",
  });
}

export function useAuthRedirect() {
  const { user } = useAuth();

  const requireAuth = (action?: string) => {
    if (!user) {
      notifySignIn(action);
      return false;
    }
    return true;
  };

  return { user, requireAuth, checkAuthWithToast: requireAuth };
}

