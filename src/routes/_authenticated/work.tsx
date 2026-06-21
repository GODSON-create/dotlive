import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Hammer,
  Loader2,
  Plus,
  Search,
  Star,
  Clock,
  Wallet,
  CheckCircle2,
  Package,
  Store,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useServices,
  useMyServices,
  useMyOrders,
  useMyBuilderProfile,
  useBuilderStats,
  useWallet,
} from "@/hooks/use-dot-data";
import {
  WORK_CATEGORIES,
  ORDER_STATUS_META,
  formatDot,
  dotToNaira,
  formatNaira,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/work")({
  head: () => ({
    meta: [
      { title: "DOT Work — Earn DOT" },
      { name: "description", content: "Hire builders or sell your skills and earn DOT." },
    ],
  }),
  component: WorkPage,
});

type Service = {
  id: string;
  builder_id: string;
  title: string;
  description: string;
  category: string;
  price_dot: number;
  delivery_days: number;
  is_active: boolean;
};

function WorkPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Hammer className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">DOT Work</h1>
          <p className="text-sm text-muted-foreground">Hire builders or earn DOT with your skills.</p>
        </div>
      </div>

      <Tabs defaultValue="browse" className="mt-6">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>
        <TabsContent value="browse">
          <BrowseTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="sell">
          <SellTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ----------------------------- Browse ----------------------------- */
function BrowseTab() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: services = [], isLoading } = useServices(category || undefined, search);
  const [order, setOrder] = useState<Service | null>(null);

  const visible = services.filter((s) => s.builder_id !== user?.id);

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {WORK_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="mt-8 size-6 animate-spin text-primary" />
      ) : visible.length === 0 ? (
        <Empty icon={Store} text="No services found. Try a different category." />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <ServiceCard key={s.id} service={s} onOrder={() => setOrder(s)} />
          ))}
        </div>
      )}

      <OrderDialog service={order} onClose={() => setOrder(null)} />
    </div>
  );
}

function ServiceCard({ service, onOrder }: { service: Service; onOrder: () => void }) {
  const { data: stats } = useBuilderStats(service.builder_id);
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{service.category}</Badge>
        {stats && Number(stats.review_count) > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-gold">
            <Star className="size-3 fill-current" /> {Number(stats.avg_rating)} ({Number(stats.review_count)})
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">{service.title}</h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{service.description}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" /> {service.delivery_days}d delivery
        </span>
        {stats && <span>{Number(stats.orders_completed)} done</span>}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold text-primary">{formatDot(service.price_dot)} DOT</p>
          <p className="text-xs text-muted-foreground">{formatNaira(dotToNaira(service.price_dot))}</p>
        </div>
        <Button variant="hero" onClick={onOrder}>
          Order
        </Button>
      </div>
    </div>
  );
}

function OrderDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: balance = 0 } = useWallet();
  const [requirements, setRequirements] = useState("");
  const [busy, setBusy] = useState(false);

  async function placeOrder() {
    if (!service) return;
    if (service.price_dot > balance) {
      toast.error("Insufficient DOT balance — top up your wallet first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_service_order", {
        _service_id: service.id,
        _requirements: requirements.trim() || undefined,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["orders", "client"] });
      toast.success("Order placed! DOT is held until you confirm delivery.");
      onClose();
      setRequirements("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order: {service?.title}</DialogTitle>
          <DialogDescription>
            {service && (
              <>
                {formatDot(service.price_dot)} DOT will be held from your wallet and released to the builder
                when you confirm the work is done.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="req">What do you need? (optional)</Label>
          <Textarea
            id="req"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Describe your requirements, links, brand assets…"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">Your balance: {formatDot(balance)} DOT</p>
        </div>
        <DialogFooter>
          <Button variant="hero" onClick={placeOrder} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Pay {service ? formatDot(service.price_dot) : ""} DOT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Orders ----------------------------- */
function OrdersTab() {
  const { data: orders = [], isLoading } = useMyOrders("client");
  const qc = useQueryClient();
  const [review, setReview] = useState<{ id: string; title: string } | null>(null);

  async function run(call: PromiseLike<{ error: unknown }>, ok: string) {
    try {
      const { error } = await call;
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["orders", "client"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }


  if (isLoading) return <Loader2 className="mt-8 size-6 animate-spin text-primary" />;
  if (orders.length === 0) return <Empty icon={Package} text="You haven't ordered any services yet." />;

  return (
    <div className="mt-4 space-y-3">
      {orders.map((o) => {
        const meta = ORDER_STATUS_META[o.status] ?? ORDER_STATUS_META.in_progress;
        return (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDot(Number(o.amount_dot))} DOT · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary" className={cn("shrink-0", meta.tone)}>
                {meta.label}
              </Badge>
            </div>
            {o.delivery_note && (
              <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                <span className="font-medium">Delivery: </span>
                {o.delivery_note}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {(o.status === "in_progress" || o.status === "delivered") && (
                <>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => run(supabase.rpc("complete_service_order", { _order_id: o.id }), "Order completed — builder paid.")}
                  >
                    <CheckCircle2 className="size-4" /> Confirm & pay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(supabase.rpc("cancel_service_order", { _order_id: o.id }), "Order cancelled — you were refunded.")}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {o.status === "completed" && (
                <Button variant="outline" size="sm" onClick={() => setReview({ id: o.id, title: o.title })}>
                  <Star className="size-4" /> Leave review
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <ReviewDialog order={review} onClose={() => setReview(null)} />
    </div>
  );
}

function ReviewDialog({ order, onClose }: { order: { id: string; title: string } | null; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!order) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_service_order", {
        _order_id: order.id,
        _rating: rating,
        _comment: comment.trim() || undefined,
      });
      if (error) throw error;
      toast.success("Thanks for your review!");
      onClose();
      setRating(5);
      setComment("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review: {order?.title}</DialogTitle>
          <DialogDescription>How was the work?</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={cn("size-7", n <= rating ? "fill-gold text-gold" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about your experience (optional)"
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="hero" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Sell ----------------------------- */
function SellTab() {
  const { user } = useAuth();
  const { data: profile, isLoading: pLoading } = useMyBuilderProfile();
  const { data: services = [] } = useMyServices();
  const { data: orders = [] } = useMyOrders("builder");
  const { data: stats } = useBuilderStats(user?.id);
  const qc = useQueryClient();
  const [editService, setEditService] = useState<Service | null | "new">(null);

  async function deliver(id: string) {
    const note = window.prompt("Add a delivery note or link for the client:");
    if (note === null) return;
    try {
      const { error } = await supabase.rpc("deliver_service_order", { _order_id: id, _note: note || undefined });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["orders", "builder"] });
      toast.success("Marked as delivered.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not deliver");
    }
  }

  async function deleteService(id: string) {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my_services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  if (pLoading) return <Loader2 className="mt-8 size-6 animate-spin text-primary" />;

  if (!profile) {
    return (
      <div className="mt-4">
        <BuilderProfileForm />
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status === "in_progress" || o.status === "delivered");

  return (
    <div className="mt-4 space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Earned" value={`${formatDot(Number(stats?.total_earned ?? 0))} DOT`} icon={Wallet} />
        <Stat label="Completed" value={String(Number(stats?.orders_completed ?? 0))} icon={CheckCircle2} />
        <Stat
          label="Rating"
          value={Number(stats?.review_count ?? 0) > 0 ? `${Number(stats?.avg_rating)} ★` : "—"}
          icon={Star}
        />
      </div>

      <BuilderProfileForm existing={profile} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your services</h2>
          <Button variant="hero" size="sm" onClick={() => setEditService("new")}>
            <Plus className="size-4" /> New service
          </Button>
        </div>
        {services.length === 0 ? (
          <Empty icon={Store} text="No services yet. Create one to start earning." />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.category} · {formatDot(s.price_dot)} DOT {!s.is_active && "· hidden"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditService(s as Service)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteService(s.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Incoming orders</h2>
        {activeOrders.length === 0 ? (
          <Empty icon={Package} text="No active orders right now." />
        ) : (
          <div className="mt-4 space-y-3">
            {activeOrders.map((o) => {
              const meta = ORDER_STATUS_META[o.status] ?? ORDER_STATUS_META.in_progress;
              return (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDot(Number(o.amount_dot))} DOT</p>
                    </div>
                    <Badge variant="secondary" className={cn("shrink-0", meta.tone)}>
                      {meta.label}
                    </Badge>
                  </div>
                  {o.requirements && (
                    <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                      <span className="font-medium">Brief: </span>
                      {o.requirements}
                    </p>
                  )}
                  {o.status === "in_progress" && (
                    <Button variant="hero" size="sm" className="mt-4" onClick={() => deliver(o.id)}>
                      Mark delivered
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editService !== null && (
        <ServiceFormDialog
          service={editService === "new" ? null : editService}
          onClose={() => setEditService(null)}
        />
      )}
    </div>
  );
}

function BuilderProfileForm({ existing }: { existing?: { headline: string; bio: string | null; skills: string[]; available: boolean } }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [headline, setHeadline] = useState(existing?.headline ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [skills, setSkills] = useState((existing?.skills ?? []).join(", "));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!user) return;
    if (!headline.trim()) {
      toast.error("Add a headline so clients know what you do.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("builder_profiles").upsert({
        id: user.id,
        headline: headline.trim(),
        bio: bio.trim() || null,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["builder_profile", user.id] });
      toast.success(existing ? "Profile updated." : "Builder profile created — start listing services!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{existing ? "Builder profile" : "Become a builder"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell clients what you do, then list services to earn DOT.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Brand & product designer for African startups"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Figma, Branding, UI" />
        </div>
        <Button variant="hero" onClick={save} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Save profile" : "Create profile"}
        </Button>
      </div>
    </div>
  );
}

function ServiceFormDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(service?.title ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [category, setCategory] = useState(service?.category ?? WORK_CATEGORIES[0]);
  const [price, setPrice] = useState(service?.price_dot ?? 1000);
  const [days, setDays] = useState(service?.delivery_days ?? 3);
  const [active, setActive] = useState(service?.is_active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    if (price <= 0 || days <= 0) {
      toast.error("Price and delivery time must be positive.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        builder_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        price_dot: Math.floor(price),
        delivery_days: Math.floor(days),
        is_active: active,
      };
      const { error } = service
        ? await supabase.from("services").update(payload).eq("id", service.id)
        : await supabase.from("services").insert(payload);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my_services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(service ? "Service updated." : "Service published.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>Clients pay in DOT and you're paid on completion.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Title</Label>
            <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-price">Price (DOT)</Label>
              <Input id="s-price" type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-days">Delivery (days)</Label>
              <Input id="s-days" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-primary" />
            Visible in marketplace
          </label>
        </div>
        <DialogFooter>
          <Button variant="hero" onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {service ? "Save" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- shared ----------------------------- */
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Store; text: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="size-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
