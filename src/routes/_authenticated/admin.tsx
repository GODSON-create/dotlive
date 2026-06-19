import { useState } from "react";
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
  head: () => ({ meta: [{ title: "Admin — DOT" }] }),
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
      <h1 className="font-display text-3xl font-bold">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage members, credits and platform content.</p>
      <Tabs defaultValue="members" className="mt-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="roles">Roles & Audit</TabsTrigger>}
        </TabsList>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        {isSuperAdmin && (
          <TabsContent value="roles"><RolesTab /></TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}

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
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => doElevate(m.id, "super_admin")}
                            >
                              <ShieldCheck className="size-4" /> Make Super Admin
                            </Button>
                          )}
                          {!isMemberAdmin && !isMemberSuper && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => doElevate(m.id, "admin")}
                            >
                              <ShieldCheck className="size-4" /> Make Admin
                            </Button>
                          )}
                          {isMemberSuper && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => doRevoke(m.id, "super_admin")}
                            >
                              <ShieldMinus className="size-4" /> Revoke Super
                            </Button>
                          )}
                          {isMemberAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => doRevoke(m.id, "admin")}
                            >
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
                  <td className="p-4 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Badge variant={a.action === "revoked" ? "destructive" : "secondary"}>
                      {a.action}
                    </Badge>
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


function MembersTab() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState("Reward");
  const [busy, setBusy] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("wallets").select("user_id, balance"),
      ]);
      const wmap = new Map((wallets ?? []).map((w) => [w.user_id, w.balance]));
      return (profiles ?? []).map((p) => ({ ...p, balance: wmap.get(p.id) ?? 0 }));
    },
  });

  async function adjust() {
    if (!target) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", {
        _user_id: target.id,
        _amount: amount,
        _type: type,
        _description: `Admin ${type.toLowerCase()}`,
      });
      if (error) throw error;
      toast.success("Balance updated");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      setTarget(null);
      setAmount(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Loader2 className="mt-6 size-6 animate-spin text-primary" />;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="p-4 font-medium">Name</th>
            <th className="p-4 font-medium">Email</th>
            <th className="p-4 font-medium">Balance</th>
            <th className="p-4 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="p-4 font-medium">{m.name ?? "—"}</td>
              <td className="p-4 text-muted-foreground">{m.email}</td>
              <td className="p-4">{formatDot(Number(m.balance))} DOT</td>
              <td className="p-4 text-right">
                <Button variant="outline" size="sm" onClick={() => setTarget({ id: m.id, name: m.name ?? m.email ?? "" })}>
                  <Coins className="size-4" /> Adjust
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust balance — {target?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                {["Reward", "Admin Adjustment", "Refund"].map((t) => (
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
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={adjust} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentTab() {
  const qc = useQueryClient();
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-3">
      <CreateCard
        title="New course"
        icon={BookOpen}
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", textarea: true },
          { key: "whop_url", label: "Whop URL" },
          { key: "category", label: "Category" },
          { key: "dot_reward", label: "DOT reward", number: true },
          { key: "vantage_boost", label: "Vantage boost", number: true },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.from("courses").insert({
            title: v.title,
            description: v.description,
            whop_url: v.whop_url,
            category: v.category,
            dot_reward: Number(v.dot_reward) || 0,
            vantage_boost: Number(v.vantage_boost) || 0,
          });
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["courses"] });
        }}
      />
      <CreateCard
        title="New session"
        icon={CalendarCheck}
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", textarea: true },
          { key: "speaker", label: "Speaker" },
          { key: "event_date", label: "Date & time", type: "datetime-local" },
          { key: "dot_cost", label: "DOT cost", number: true },
          { key: "capacity", label: "Capacity", number: true },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.from("events").insert({
            title: v.title,
            description: v.description,
            speaker: v.speaker,
            event_date: v.event_date ? new Date(v.event_date).toISOString() : null,
            dot_cost: Number(v.dot_cost) || 0,
            capacity: Number(v.capacity) || 100,
          });
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["events"] });
        }}
      />
      <CreateCard
        title="New pitchathon"
        icon={Trophy}
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", textarea: true },
          { key: "prize", label: "Prize" },
          { key: "start_date", label: "Start", type: "datetime-local" },
          { key: "end_date", label: "End", type: "datetime-local" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.from("pitchathons").insert({
            title: v.title,
            description: v.description,
            prize: v.prize,
            start_date: v.start_date ? new Date(v.start_date).toISOString() : null,
            end_date: v.end_date ? new Date(v.end_date).toISOString() : null,
            status: "open",
          });
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["pitchathons"] });
        }}
      />
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

function CreateCard({
  title,
  icon: Icon,
  fields,
  onSubmit,
}: {
  title: string;
  icon: typeof BookOpen;
  fields: FieldDef[];
  onSubmit: (v: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(values);
      toast.success(`${title} created`);
      setValues({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
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
      <Button type="submit" variant="hero" className="mt-4 w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Create
      </Button>
    </form>
  );
}
