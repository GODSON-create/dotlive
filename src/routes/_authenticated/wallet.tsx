import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, ArrowDownToLine, Loader2, Plus, Minus, Gift, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWallet, useTransactions } from "@/hooks/use-dot-data";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  MIN_DEPOSIT_DOT,
  DOT_RATE_NGN,
  dotToNaira,
  formatDot,
  formatNaira,
} from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "DOT Wallet — DOT" }] }),
  component: WalletPage,
});

const TYPE_META: Record<string, { icon: typeof Plus; tone: string }> = {
  Deposit: { icon: ArrowDownToLine, tone: "text-primary" },
  Reward: { icon: Gift, tone: "text-gold" },
  Spend: { icon: Minus, tone: "text-destructive" },
  Refund: { icon: Plus, tone: "text-primary" },
  "Admin Adjustment": { icon: Settings2, tone: "text-muted-foreground" },
};

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: balance = 0 } = useWallet();
  const { data: transactions = [] } = useTransactions();
  const [amount, setAmount] = useState(MIN_DEPOSIT_DOT);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDeposit() {
    // Deposits must go through a verified payment provider (Paystack).
    // Self-service crediting has been disabled for wallet integrity.
    toast.info("Card & bank funding via Paystack is coming soon.");
    setOpen(false);
  }
  // setBusy retained for the upcoming Paystack flow
  void setBusy;



  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">DOT Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your internal ecosystem credits · 1 DOT = {formatNaira(DOT_RATE_NGN)}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2 [background-image:var(--gradient-primary)]">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Wallet className="size-5" />
            <span className="text-sm font-medium">Available balance</span>
          </div>
          <p className="mt-4 font-display text-5xl font-bold text-primary-foreground">
            {formatDot(balance)} <span className="text-2xl font-medium">DOT</span>
          </p>
          <p className="mt-1 text-sm text-primary-foreground/80">≈ {formatNaira(dotToNaira(balance))}</p>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-2xl border border-border bg-card p-6">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="w-full">
                <ArrowDownToLine className="size-4" /> Deposit DOT
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deposit DOT</DialogTitle>
                <DialogDescription>
                  Minimum {formatDot(MIN_DEPOSIT_DOT)} DOT. 1 DOT = {formatNaira(DOT_RATE_NGN)}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="amount">Amount (DOT)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={MIN_DEPOSIT_DOT}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  You'll pay {formatNaira(dotToNaira(amount || 0))}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[2000, 5000, 10000, 20000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm",
                        amount === v ? "border-primary bg-primary/10 text-primary" : "border-border",
                      )}
                    >
                      {formatDot(v)}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="hero" onClick={handleDeposit} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Confirm deposit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <p className="text-center text-xs text-muted-foreground">
            Card & bank payment via Paystack/Flutterwave coming soon
          </p>
        </div>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">Transaction history</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {transactions.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => {
              const meta = TYPE_META[t.type] ?? TYPE_META["Admin Adjustment"];
              const positive = Number(t.amount) >= 0;
              return (
                <li key={t.id} className="flex items-center gap-4 p-4">
                  <span className={cn("flex size-9 items-center justify-center rounded-lg bg-muted", meta.tone)}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description || t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.type} · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={cn("font-display text-sm font-semibold", positive ? "text-primary" : "text-destructive")}>
                    {positive ? "+" : ""}
                    {formatDot(Number(t.amount))} DOT
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
