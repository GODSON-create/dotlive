import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Shield,
  Coins,
  Plus,
  BookOpen,
  CalendarCheck,
  Trophy,
  ShieldCheck,
  ShieldMinus,
  History,
  Users,
  Landmark,
  Snowflake,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  Search,
  TrendingUp,
  Wallet as WalletIcon,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatDot, formatNaira, ROLE_LABELS, type AppRole } from "@/lib/constants";
import { elevateUser, revokeAdmin, claimSuperAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — DOT" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { roles, refresh } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");
  const claim = useServerFn(claimSuperAdmin);
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    setClaiming(true);
    try {
      await claim();
      toast.success("You are now the Super Admin");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setClaiming(false);
    }
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <Shield className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this area.</p>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-border bg-card p-5 text-left">
            <h2 className="font-display font-semibold">Platform setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              If no Super Admin exists yet, you can claim it once to initialise the platform.
            </p>
            <Button variant="hero" className="mt-4" onClick={handleClaim} disabled={claiming}>
              {claiming ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Claim initial Super Admin
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Admin Portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Executive overview, ecosystem reserve, wallet controls and platform content.
      </p>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="reserve">Reserve</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="roles">Roles & Audit</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="wallets"><WalletsTab /></TabsContent>
        <TabsContent value="reserve"><ReserveTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        {isSuperAdmin && (
          <TabsContent value="roles"><RolesTab /></TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}

/* ===================== Executive Overview ===================== */

interface Overview {
  users: { total: number; new_today: number; new_week: number };
  founders: { total: number; completed_vantage: number; avg_vantage: number; fundable: number };
  communities: { total: number; leaders: number; members: number };
  academy: { enrollments: number; completed: number };
  financial: {
    total_revenue_ngn: number;
    total_dot_issued: number;
    total_dot_spent: number;
    wallet_balances: number;
    reserve_balance: number;
  };
  marketplace: { orders_completed: number; builder_revenue: number; active_services: number };
  investors: { registered: number; saves: number; meetings: number };
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });

  if (isLoading || !data) return <Loader2 className="mt-6 size-6 animate-spin text-primary" />;

  return (
    <div className="mt-4 space-y-8">
      <MetricGroup title="Users" icon={Users}>
        <Stat label="Total users" value={String(data.users.total)} />
        <Stat label="New today" value={String(data.users.new_today)} />
        <Stat label="New this week" value={String(data.users.new_week)} />
      </MetricGroup>

      <MetricGroup title="Founders" icon={TrendingUp}>
        <Stat label="Total founders" value={String(data.founders.total)} />
        <Stat label="Completed Vantage" value={String(data.founders.completed_vantage)} />
        <Stat label="Avg Vantage" value={String(data.founders.avg_vantage)} />
        <Stat label="Fundable ventures" value={String(data.founders.fundable)} />
      </MetricGroup>

      <MetricGroup title="Communities" icon={Users}>
        <Stat label="Communities" value={String(data.communities.total)} />
        <Stat label="Community leaders" value={String(data.communities.leaders)} />
        <Stat label="Members" value={String(data.communities.members)} />
      </MetricGroup>

      <MetricGroup title="Academy" icon={BookOpen}>
        <Stat label="Enrollments" value={String(data.academy.enrollments)} />
        <Stat label="Completed" value={String(data.academy.completed)} />
      </MetricGroup>

      <MetricGroup title="Financial" icon={WalletIcon}>
        <Stat label="Revenue" value={formatNaira(data.financial.total_revenue_ngn)} />
        <Stat label="DOT issued" value={formatDot(data.financial.total_dot_issued)} />
        <Stat label="DOT spent" value={formatDot(data.financial.total_dot_spent)} />
        <Stat label="Wallet balances" value={`${formatDot(data.financial.wallet_balances)} DOT`} />
        <Stat label="Reserve balance" value={`${formatDot(data.financial.reserve_balance)} DOT`} />
      </MetricGroup>

      <MetricGroup title="Marketplace" icon={Building2}>
        <Stat label="Orders completed" value={String(data.marketplace.orders_completed)} />
        <Stat label="Builder revenue" value={`${formatDot(data.marketplace.builder_revenue)} DOT`} />
        <Stat label="Active services" value={String(data.marketplace.active_services)} />
      </MetricGroup>

      <MetricGroup title="Investors" icon={Landmark}>
        <Stat label="Investors registered" value={String(data.investors.registered)} />
        <Stat label="Ventures saved" value={String(data.investors.saves)} />
        <Stat label="Meetings requested" value={String(data.investors.meetings)} />
      </MetricGroup>
    </div>
  );
}

function MetricGroup({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

/* ===================== Wallets & Controls ===================== */

function WalletsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState("Admin Credit");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, name, email, dot_id"),
        supabase.from("wallets").select("user_id, balance, status"),
      ]);
      const wmap = new Map((wallets ?? []).map((w) => [w.user_id, w]));
      return (profiles ?? []).map((p) => {
        const w = wmap.get(p.id);
        return { ...p, balance: w?.balance ?? 0, status: w?.status ?? "active" };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.dot_id ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  async function adjust() {
    if (!target) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_ledger_adjust", {
        _user_id: target.id,
        _amount: amount,
        _type: type,
        _description: `Admin ${type.toLowerCase()}`,
        _reason: reason || undefined,
      });
      if (error) throw error;
      toast.success("Balance updated and logged to ledger");
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      setTarget(null);
      setAmount(0);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(userId: string, status: string) {
    try {
      const { error } = await supabase.rpc("set_wallet_status", {
        _user_id: userId,
        _status: status,
        _reason: `Set to ${status} by admin`,
      });
      if (error) throw error;
      toast.success(`Wallet ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (isLoading) return <Loader2 className="mt-6 size-6 animate-spin text-primary" />;

  return (
    <div className="mt-4 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, email or DOT ID"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">DOT ID</th>
              <th className="p-4 font-medium">Balance</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="p-4">
                  <div className="font-medium">{m.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{m.dot_id}</td>
                <td className="p-4">{formatDot(Number(m.balance))} DOT</td>
                <td className="p-4">
                  <Badge
                    variant={
                      m.status === "active" ? "secondary" : m.status === "frozen" ? "default" : "destructive"
                    }
                  >
                    {m.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTarget({ id: m.id, name: m.name ?? m.email ?? "" })}
                    >
                      <Coins className="size-4" /> Adjust
                    </Button>
                    {m.status === "active" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setStatus(m.id, "frozen")}>
                          <Snowflake className="size-4" /> Freeze
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setStatus(m.id, "suspended")}>
                          <Lock className="size-4" /> Suspend
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setStatus(m.id, "active")}>
                        <Unlock className="size-4" /> Restore
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust balance — {target?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {["Admin Credit", "Reward", "Admin Adjustment", "Refund"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-full border px-3 py-1 text-sm ${type === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amt">Amount (DOT, use negative to deduct)</Label>
              <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rsn">Reason (recorded in audit log)</Label>
              <Input id="rsn" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reversing duplicate charge" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={adjust} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Apply through ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== Ecosystem Reserve ===================== */

function ReserveTab() {
  const qc = useQueryClient();
  const [recipientDotId, setRecipientDotId] = useState("");
  const [amount, setAmount] = useState(0);
  const [purpose, setPurpose] = useState("Founder Scholarship");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: reserve } = useQuery({
    queryKey: ["reserve-wallet"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reserve_wallet").select("balance, updated_at").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["reserve-allocations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reserve_allocations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function allocate() {
    setBusy(true);
    try {
      const { data: recipient, error: lookupErr } = await supabase.rpc("lookup_dot_id", {
        _dot_id: recipientDotId,
      });
      if (lookupErr) throw lookupErr;
      if (!recipient) throw new Error("No member found for that DOT ID");

      // Resolve the recipient's user id from profiles
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .ilike("dot_id", recipientDotId.trim())
        .maybeSingle();
      if (profErr) throw profErr;
      if (!prof) throw new Error("No member found for that DOT ID");

      const { error } = await supabase.rpc("allocate_from_reserve", {
        _recipient: prof.id,
        _amount: amount,
        _purpose: purpose,
        _description: description || undefined,
      });
      if (error) throw error;
      toast.success(`Allocated ${formatDot(amount)} DOT to ${recipient}`);
      qc.invalidateQueries({ queryKey: ["reserve-wallet"] });
      qc.invalidateQueries({ queryKey: ["reserve-allocations"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      setRecipientDotId("");
      setAmount(0);
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-2xl border border-border [background-image:var(--gradient-primary)] p-6 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Landmark className="size-5" />
          <h3 className="font-display font-semibold">DOT Ecosystem Reserve</h3>
        </div>
        <p className="mt-3 font-display text-4xl font-bold">{formatDot(Number(reserve?.balance ?? 0))} DOT</p>
        <p className="mt-1 text-sm opacity-80">
          Funds scholarships, rewards, grants and ecosystem growth. Every allocation is logged.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold">Allocate from reserve</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Recipient DOT ID</Label>
            <Input value={recipientDotId} onChange={(e) => setRecipientDotId(e.target.value)} placeholder="DOT-100042" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Amount (DOT)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Purpose</Label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {[
                "Founder Scholarship",
                "Reward",
                "Grant",
                "Incentive",
                "Community Leader Reward",
                "Pilot Program",
                "Ecosystem Growth",
                "Internal Testing",
              ].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <Button variant="hero" className="mt-4" onClick={allocate} disabled={busy || !recipientDotId || amount <= 0}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
          Allocate
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display font-semibold">Recent allocations</h3>
        </div>
        {allocations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No allocations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">When</th>
                <th className="p-4 font-medium">Purpose</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allocations.map((a) => (
                <tr key={a.id}>
                  <td className="p-4 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-4"><Badge variant="secondary">{a.purpose}</Badge></td>
                  <td className="p-4">{formatDot(Number(a.amount))} DOT</td>
                  <td className="p-4 text-muted-foreground">{a.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <History className="size-5 text-primary" />
          <h3 className="font-display font-semibold">Admin action audit log</h3>
        </div>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No admin actions recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">When</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="p-4 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-4"><Badge variant="outline">{a.action}</Badge></td>
                  <td className="p-4">{a.amount != null ? `${formatDot(Number(a.amount))} DOT` : "—"}</td>
                  <td className="p-4 text-muted-foreground">{a.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ===================== Roles & Audit ===================== */

function RolesTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const elevate = useServerFn(elevateUser);
  const revoke = useServerFn(revokeAdmin);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-roles-members"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rmap = new Map<string, AppRole[]>();
      (roleRows ?? []).forEach((r) => {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rmap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: rmap.get(p.id) ?? [] }));
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["role-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("role_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function doElevate(id: string, role: AppRole) {
    setBusyId(id);
    try {
      await elevate({ data: { targetUserId: id, newRole: role } });
      toast.success(`Granted ${ROLE_LABELS[role]}`);
      qc.invalidateQueries({ queryKey: ["admin-roles-members"] });
      qc.invalidateQueries({ queryKey: ["role-audit-log"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doRevoke(id: string, role: AppRole) {
    setBusyId(id);
    try {
      await revoke({ data: { targetUserId: id, role } });
      toast.success(`Revoked ${ROLE_LABELS[role]}`);
      qc.invalidateQueries({ queryKey: ["admin-roles-members"] });
      qc.invalidateQueries({ queryKey: ["role-audit-log"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <Loader2 className="mt-6 size-6 animate-spin text-primary" />;

  return (
    <div className="mt-4 space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display font-semibold">Admin assignment</h3>
          <p className="text-sm text-muted-foreground">
            Grant or revoke admin access. You cannot change your own role.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Roles</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => {
              const isSelf = m.id === user?.id;
              const isMemberAdmin = m.roles.includes("admin");
              const isMemberSuper = m.roles.includes("super_admin");
              return (
                <tr key={m.id}>
                  <td className="p-4">
                    <div className="font-medium">{m.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {m.roles.length === 0 && <span className="text-muted-foreground">—</span>}
                      {m.roles.map((r) => (
                        <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>
                          {ROLE_LABELS[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">Your account</span>
                      ) : (
                        <>
                          {!isMemberSuper && (
                            <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => doElevate(m.id, "super_admin")}>
                              <ShieldCheck className="size-4" /> Make Super Admin
                            </Button>
                          )}
                          {!isMemberAdmin && !isMemberSuper && (
                            <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => doElevate(m.id, "admin")}>
                              <ShieldCheck className="size-4" /> Make Admin
                            </Button>
                          )}
                          {isMemberSuper && (
                            <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => doRevoke(m.id, "super_admin")}>
                              <ShieldMinus className="size-4" /> Revoke Super
                            </Button>
                          )}
                          {isMemberAdmin && (
                            <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => doRevoke(m.id, "admin")}>
                              <ShieldMinus className="size-4" /> Revoke Admin
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <History className="size-5 text-primary" />
          <h3 className="font-display font-semibold">Role audit log</h3>
        </div>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No role changes recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">When</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Previous</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="p-4 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-4">
                    <Badge variant={a.action === "revoked" ? "destructive" : "secondary"}>{a.action}</Badge>
                  </td>
                  <td className="p-4">{a.new_role}</td>
                  <td className="p-4 text-muted-foreground">{a.previous_role ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ===================== Payments ===================== */

function PaymentsTab() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const [{ data: rows }, { data: profiles }] = await Promise.all([
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, name, email"),
      ]);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  const totals = payments.reduce(
    (acc, p) => {
      if (p.credited_at) {
        acc.dot += Number(p.dot_amount);
        acc.naira += Number(p.naira_amount);
        acc.count += 1;
      }
      return acc;
    },
    { dot: 0, naira: 0, count: 0 },
  );

  if (isLoading) return <Loader2 className="mt-6 size-6 animate-spin text-primary" />;

  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Successful payments" value={String(totals.count)} />
        <Stat label="DOT funded" value={`${formatDot(totals.dot)} DOT`} />
        <Stat label="Revenue" value={formatNaira(totals.naira)} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">DOT</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Channel</th>
              <th className="p-4 font-medium">Reference</th>
              <th className="p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">No payments recorded yet.</td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="p-4">
                  <div className="font-medium">{p.profile?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.profile?.email}</div>
                </td>
                <td className="p-4">{formatDot(Number(p.dot_amount))}</td>
                <td className="p-4">{formatNaira(Number(p.naira_amount))}</td>
                <td className="p-4">
                  <Badge variant={p.credited_at ? "default" : p.status === "pending" ? "secondary" : "destructive"}>
                    {p.credited_at ? "credited" : p.status}
                  </Badge>
                </td>
                <td className="p-4 text-muted-foreground">{p.channel ?? "—"}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{p.reference}</td>
                <td className="p-4 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Wallets are credited only after Paystack verifies the payment. To credit or refund manually,
        use the <strong>Wallets</strong> tab — every change is written permanently to the ledger and audit log.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ===================== Content management ===================== */

function ContentTab() {
  return (
    <div className="mt-4 space-y-8">
      <CoursesManager />
      <SessionsManager />
      <PitchathonsManager />
    </div>
  );
}

interface FieldDef {
  key: string;
  label: string;
  textarea?: boolean;
  number?: boolean;
  type?: string;
}

function CoursesManager() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const fields: FieldDef[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", textarea: true },
    { key: "whop_url", label: "Whop URL" },
    { key: "category", label: "Category" },
    { key: "dot_reward", label: "DOT reward", number: true },
    { key: "vantage_boost", label: "Vantage boost", number: true },
  ];
  return (
    <RecordManager
      title="Courses"
      icon={BookOpen}
      rows={rows}
      fields={fields}
      columns={[{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "dot_reward", label: "Reward" }]}
      onCreate={async (v) => {
        const { error } = await supabase.from("courses").insert({
          title: v.title, description: v.description, whop_url: v.whop_url, category: v.category,
          dot_reward: Number(v.dot_reward) || 0, vantage_boost: Number(v.vantage_boost) || 0,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["courses"] });
      }}
      onUpdate={async (id, v) => {
        const { error } = await supabase.from("courses").update({
          title: v.title, description: v.description, whop_url: v.whop_url, category: v.category,
          dot_reward: Number(v.dot_reward) || 0, vantage_boost: Number(v.vantage_boost) || 0,
        }).eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["courses"] });
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["courses"] });
      }}
    />
  );
}

function SessionsManager() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("events").select("*").order("event_date", { ascending: false })).data ?? [],
  });
  const fields: FieldDef[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", textarea: true },
    { key: "speaker", label: "Speaker" },
    { key: "event_date", label: "Date & time", type: "datetime-local" },
    { key: "dot_cost", label: "DOT cost", number: true },
    { key: "capacity", label: "Capacity", number: true },
  ];
  return (
    <RecordManager
      title="Founder Sessions"
      icon={CalendarCheck}
      rows={rows}
      fields={fields}
      columns={[{ key: "title", label: "Title" }, { key: "speaker", label: "Speaker" }]}
      toForm={(r) => ({ ...r, event_date: r.event_date ? new Date(r.event_date).toISOString().slice(0, 16) : "" })}
      onCreate={async (v) => {
        const { error } = await supabase.from("events").insert({
          title: v.title, description: v.description, speaker: v.speaker,
          event_date: v.event_date ? new Date(v.event_date).toISOString() : null,
          dot_cost: Number(v.dot_cost) || 0, capacity: Number(v.capacity) || 100,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["events"] });
      }}
      onUpdate={async (id, v) => {
        const { error } = await supabase.from("events").update({
          title: v.title, description: v.description, speaker: v.speaker,
          event_date: v.event_date ? new Date(v.event_date).toISOString() : null,
          dot_cost: Number(v.dot_cost) || 0, capacity: Number(v.capacity) || 100,
        }).eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["events"] });
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["events"] });
      }}
    />
  );
}

function PitchathonsManager() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["pitchathons"],
    queryFn: async () => (await supabase.from("pitchathons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const fields: FieldDef[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", textarea: true },
    { key: "prize", label: "Prize" },
    { key: "start_date", label: "Start", type: "datetime-local" },
    { key: "end_date", label: "End", type: "datetime-local" },
    { key: "status", label: "Status (open/closed/judging)" },
  ];
  return (
    <RecordManager
      title="Pitchathons"
      icon={Trophy}
      rows={rows}
      fields={fields}
      columns={[{ key: "title", label: "Title" }, { key: "status", label: "Status" }]}
      toForm={(r) => ({
        ...r,
        start_date: r.start_date ? new Date(r.start_date).toISOString().slice(0, 16) : "",
        end_date: r.end_date ? new Date(r.end_date).toISOString().slice(0, 16) : "",
      })}
      onCreate={async (v) => {
        const { error } = await supabase.from("pitchathons").insert({
          title: v.title, description: v.description, prize: v.prize,
          start_date: v.start_date ? new Date(v.start_date).toISOString() : null,
          end_date: v.end_date ? new Date(v.end_date).toISOString() : null,
          status: v.status || "open",
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["pitchathons"] });
      }}
      onUpdate={async (id, v) => {
        const { error } = await supabase.from("pitchathons").update({
          title: v.title, description: v.description, prize: v.prize,
          start_date: v.start_date ? new Date(v.start_date).toISOString() : null,
          end_date: v.end_date ? new Date(v.end_date).toISOString() : null,
          status: v.status || "open",
        }).eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["pitchathons"] });
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("pitchathons").delete().eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["pitchathons"] });
      }}
    />
  );
}

interface ManagerRow {
  id: string;
  [key: string]: unknown;
}

function RecordManager({
  title,
  icon: Icon,
  rows,
  fields,
  columns,
  toForm,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  icon: typeof BookOpen;
  rows: ManagerRow[];
  fields: FieldDef[];
  columns: { key: string; label: string }[];
  toForm?: (row: ManagerRow) => Record<string, unknown>;
  onCreate: (v: Record<string, string>) => Promise<void>;
  onUpdate: (id: string, v: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<ManagerRow | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function openNew() {
    setValues({});
    setEditing("new");
  }
  function openEdit(row: ManagerRow) {
    const src = toForm ? toForm(row) : row;
    const v: Record<string, string> = {};
    fields.forEach((f) => {
      const raw = src[f.key];
      v[f.key] = raw == null ? "" : String(raw);
    });
    setValues(v);
    setEditing(row);
  }

  async function save() {
    setBusy(true);
    try {
      if (editing === "new") await onCreate(values);
      else if (editing) await onUpdate(editing.id, values);
      toast.success(`${title} saved`);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await onDelete(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <h3 className="font-display font-semibold">{title}</h3>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <Button variant="hero" size="sm" onClick={openNew}>
          <Plus className="size-4" /> New
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className="p-4 font-medium">{c.label}</th>
            ))}
            <th className="p-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">Nothing yet.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key} className="p-4">{r[c.key] == null ? "—" : String(r[c.key])}</td>
              ))}
              <td className="p-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? `New ${title}` : `Edit ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                {f.textarea ? (
                  <Textarea
                    rows={2}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={f.type ?? (f.number ? "number" : "text")}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
