import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { Input } from "@/Top/Component/UI/Input";
import { toast } from "@/Middle/Hook/Use-Toast";
import { supabase } from "@/Bottom/Integration/Supabase/client";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);
  };

  // Success state – same clean container, no icon, minimal text
  if (isSubmitted) {
    return (
      <Layout>
        <Container className="w-full max-w-md mx-auto !rounded-[48px] p-8 sm:p-10 mt-0 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Link to="/Sign-In">
            <Button variant="outline" className="w-full font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="w-full max-w-md mx-auto !rounded-[48px] p-8 sm:p-10 mt-0 space-y-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12"
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            variant="outline"
            className="w-full font-bold"
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
            Send Reset Link
          </Button>
        </form>

        <div className="flex justify-center">
          <Link
            to="/Sign-In"
            className="text-sm font-bold text-foreground hover:underline transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </Container>
    </Layout>
  );
}