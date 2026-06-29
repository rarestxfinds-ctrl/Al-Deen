import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { useAdmin } from "Client/Context/Admin";
import { supabase } from "Server/Integration/Supabase/client";
import { Users, Activity, LogOut, Shield, Eye, MousePointerClick, Clock } from "lucide-react";

interface VisitorStats {
  totalVisits: number;
  uniqueDays: number;
  lastVisit: string | null;
  recentRoutes: { route: string; count: number }[];
}

function readVisitorStats(): VisitorStats {
  try {
    const raw = localStorage.getItem("lovable-visit-log");
    const log: { route: string; ts: number }[] = raw ? JSON.parse(raw) : [];
    const days = new Set(log.map((e) => new Date(e.ts).toDateString()));
    const routeCounts: Record<string, number> = {};
    for (const e of log) routeCounts[e.route] = (routeCounts[e.route] || 0) + 1;
    const recentRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return {
      totalVisits: log.length,
      uniqueDays: days.size,
      lastVisit: log.length ? new Date(log[log.length - 1].ts).toLocaleString() : null,
      recentRoutes,
    };
  } catch {
    return { totalVisits: 0, uniqueDays: 0, lastVisit: null, recentRoutes: [] };
  }
}

export default function AdminDashboard() {
  const { isAdmin, signOut } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<{ id: string; email?: string; created_at?: string }[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [stats, setStats] = useState<VisitorStats>(() => readVisitorStats());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles" as any)
          .select("id,email,created_at")
          .limit(100);
        if (!alive) return;
        if (error) setUsersError("User listing requires a backend admin endpoint.");
        else if (data) setUsers(data as any);
      } catch {
        if (alive) setUsersError("User listing unavailable.");
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!isAdmin) return <Navigate to="/Admin/Login" replace />;

  const handleSignOut = () => {
    signOut();
    navigate("/Admin/Login", { replace: true });
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-6 space-y-4">
        <Container className="!py-3 !px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <Button size="sm" variant="outline" onClick={handleSignOut} className="rounded-full">
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </Container>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Container className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Total page views</div>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{stats.totalVisits}</p>
          </Container>
          <Container className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Active days</div>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{stats.uniqueDays}</p>
          </Container>
          <Container className="!p-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Last visit</div>
            <p className="text-sm mt-1 truncate">{stats.lastVisit || "—"}</p>
          </Container>
        </div>

        <Container className="!p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick className="h-4 w-4" />
            <h2 className="font-semibold">Top routes</h2>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setStats(readVisitorStats())}>Refresh</Button>
          </div>
          {stats.recentRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visit data yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {stats.recentRoutes.map((r) => (
                <li key={r.route} className="flex items-center justify-between py-2 text-sm">
                  <code className="truncate">{r.route}</code>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Container>

        <Container className="!p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <h2 className="font-semibold">User accounts</h2>
            <span className="ml-auto text-xs text-muted-foreground">{users.length} shown</span>
          </div>
          {usersError ? (
            <p className="text-sm text-muted-foreground">{usersError}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm gap-3">
                  <div className="min-w-0">
                    <p className="truncate">{u.email || u.id}</p>
                    {u.created_at && (
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">user</span>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </div>
    </Layout>
  );
}