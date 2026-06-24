import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-dot-data";
import { formatDot } from "@/lib/constants";
import { toast } from "sonner";
import {
  Store,
  Plus,
  Loader2,
  Tag,
  Download,
  ShoppingBag,
  ExternalLink,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({
    meta: [
      { title: "DOT Store — DOT" },
      { name: "description", content: "Trade templates, prompt packs, courses and toolkits." },
    ],
  }),
  component: StorePage,
});

const CATEGORIES = ["Template", "Toolkit", "Course", "Prompt Pack", "Automation", "Ebook"] as const;
type Category = (typeof CATEGORIES)[number] | "all";

interface StoreItem {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  category: string;
  price_dot: number;
  file_url: string | null;
  download_instructions: string | null;
  is_active: boolean;
  created_at: string;
}

function StorePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: balance = 0 } = useWallet();

  const [activeTab, setActiveTab] = useState<Category>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState<StoreItem | null>(null);

  // Add Item State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Template");
  const [price, setPrice] = useState<number>(100);
  const [fileUrl, setFileUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  // Query all active items
  const { data: items = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["store-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_items")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreItem[];
    },
  });

  // Query items purchased by user
  const { data: purchases = [] } = useQuery({
    queryKey: ["my-store-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("item_id")
        .eq("buyer_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const purchasedSet = new Set(purchases.map((p) => p.item_id));

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.category === activeTab;
  });

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title || !description || price < 0) {
      toast.error("Please fill required fields");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("store_items").insert({
        vendor_id: user.id,
        title,
        description,
        category: category === "all" ? "Template" : category,
        price_dot: price,
        file_url: fileUrl || null,
        download_instructions: instructions || null,
      });
      if (error) throw error;
      toast.success("Asset listed successfully!");
      qc.invalidateQueries({ queryKey: ["store-items"] });
      setShowAddModal(false);
      // Reset form
      setTitle("");
      setDescription("");
      setPrice(100);
      setFileUrl("");
      setInstructions("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list item");
    } finally {
      setBusy(false);
    }
  }

  async function handleBuyItem() {
    if (!user || !showPurchaseModal) return;
    const item = showPurchaseModal;
    if (balance < item.price_dot) {
      toast.error("Insufficient DOT balance");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("purchase_store_item", { _item_id: item.id });
      if (error) throw error;

      toast.success(`Purchased "${item.title}" successfully!`);
      qc.invalidateQueries({ queryKey: ["store-items"] });
      qc.invalidateQueries({ queryKey: ["my-store-purchases", user.id] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setShowPurchaseModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Store className="size-8 text-primary" />
            DOT Store
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acquire templates, ebooks, automations and toolkits listing in the network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs" onClick={() => setShowAddModal(true)}>
            <Plus className="size-4 mr-1" /> List Asset
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          All Assets
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No store items found in this category.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isOwn = item.vendor_id === user?.id;
            const isBought = purchasedSet.has(item.id);

            return (
              <div key={item.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 relative">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                    {item.category}
                  </Badge>
                  <span className="font-display font-bold text-gradient text-sm">
                    {item.price_dot > 0 ? `${formatDot(item.price_dot)} DOT` : "Free"}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground line-clamp-1">{item.title}</h3>
                <p className="mt-2 flex-1 text-xs text-muted-foreground line-clamp-3 leading-relaxed">{item.description}</p>

                {/* Card footer CTA */}
                <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-2">
                  {isOwn ? (
                    <Button variant="outline" className="w-full text-xs font-medium" disabled>
                      Your Listing
                    </Button>
                  ) : isBought ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
                        <CheckCircle2 className="size-4" /> Purchased
                      </div>
                      {item.file_url && (
                        <Button
                          variant="hero"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => window.open(item.file_url!, "_blank", "noopener")}
                        >
                          <Download className="size-3.5 mr-1" /> Download File
                        </Button>
                      )}
                      {item.download_instructions && (
                        <div className="rounded-lg bg-muted p-2.5 text-[11px] text-slate-300 border border-border">
                          <span className="font-bold flex items-center gap-1"><Info className="size-3" /> Instructions:</span>
                          <p className="mt-1">{item.download_instructions}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="hero"
                      className="w-full text-xs"
                      onClick={() => setShowPurchaseModal(item)}
                    >
                      <ShoppingBag className="size-3.5 mr-1" /> Get Asset
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Listing Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>List Digital Asset</DialogTitle>
            <DialogDescription>List a template, prompt pack or eBook for other founders.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. pitch deck model" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description *</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain what is included..." required />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat">Category</Label>
                <select
                  id="cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (DOT) *</Label>
                <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">Asset Download URL (Optional)</Label>
              <Input id="file" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instr">Download Instructions (Optional)</Label>
              <Textarea id="instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. check the second page for download instructions..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "List Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Confirmation Modal */}
      <Dialog open={!!showPurchaseModal} onOpenChange={(o) => !o && setShowPurchaseModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to purchase this digital asset?
            </DialogDescription>
          </DialogHeader>
          {showPurchaseModal && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset:</span>
                  <span className="font-bold text-white text-right">{showPurchaseModal.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-bold text-white">{showPurchaseModal.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-bold text-primary">{formatDot(showPurchaseModal.price_dot)} DOT</span>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowPurchaseModal(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="hero" className="w-full sm:w-auto" onClick={handleBuyItem} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : `Buy for ${formatDot(showPurchaseModal.price_dot)} DOT`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
