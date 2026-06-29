import { useState, FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { Input } from "Client/Component/UI/Input";
import { Label } from "Client/Component/UI/Label";
import { useAdmin } from "Client/Context/Admin";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const { isAdmin, signIn } = useAdmin();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAdmin) return <Navigate to="/Admin" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const r = signIn(username.trim(), password);
    if (r.ok) navigate("/Admin", { replace: true });
    else setError(r.error || "Login failed");
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto py-10">
        <Container className="!p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Admin Sign In</h1>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="adm-user">Username</Label>
              <Input id="adm-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adm-pass">Password</Label>
              <Input id="adm-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
            <p className="text-xs text-muted-foreground text-center">
              Default credentials: admin / admin
            </p>
          </form>
        </Container>
      </div>
    </Layout>
  );
}