import { useState } from "react";
import { Send, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
import { formatDot, dotToNaira, formatNaira } from "@/lib/constants";
import { toast } from "sonner";

type Step = "details" | "confirm" | "done";

export function TransferDialog({ balance, myDotId }: { balance: number; myDotId?: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [recipientId, setRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("details");
    setRecipientId("");
    setRecipientName(null);
    setAmount(0);
    setNote("");
    setBusy(false);
  }

  function close(o: boolean) {
    setOpen(o);
    if (!o) setTimeout(reset, 200);
  }

  async function handleLookup() {
    const code = recipientId.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a DOT ID");
      return;
    }
    if (myDotId && code === myDotId.toUpperCase()) {
      toast.error("You cannot transfer to yourself");
      return;
    }
    if (amount <= 0) {
      toast.error("Enter an amount to send");
      return;
    }
    if (amount > balance) {
      toast.error("Amount exceeds your balance");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("lookup_dot_id", { _dot_id: code });
      if (error) throw error;
      if (!data) {
        toast.error("No wallet found for that DOT ID");
        return;
      }
      setRecipientName(data);
      setStep("confirm");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransfer() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("transfer_dot", {
        _recipient_dot_id: recipientId.trim().toUpperCase(),
        _amount: Math.floor(amount),
        _note: note.trim() || undefined,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setStep("done");
      toast.success(`Sent ${formatDot(amount)} DOT to ${recipientName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button variant="gold" className="w-full">
          <Send className="size-4" /> Send DOT
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Send DOT</DialogTitle>
              <DialogDescription>
                Transfer credits instantly to another user by their DOT ID.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="recipient">Recipient DOT ID</Label>
                <Input
                  id="recipient"
                  placeholder="DOT-100042"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="font-mono uppercase"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-amount">Amount (DOT)</Label>
                <Input
                  id="t-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {formatDot(balance)} DOT · ≈ {formatNaira(dotToNaira(amount || 0))}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-note">Note (optional)</Label>
                <Input
                  id="t-note"
                  placeholder="What's this for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={handleLookup} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm transfer</DialogTitle>
              <DialogDescription>Please review before sending. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <Row label="To" value={recipientName ?? recipientId} />
              <Row label="DOT ID" value={recipientId.toUpperCase()} mono />
              <Row label="Amount" value={`${formatDot(amount)} DOT`} />
              {note.trim() && <Row label="Note" value={note.trim()} />}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("details")} disabled={busy}>
                Back
              </Button>
              <Button variant="hero" onClick={handleTransfer} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Send {formatDot(amount)} DOT
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Transfer complete</DialogTitle>
              <DialogDescription className="text-center">
                {formatDot(amount)} DOT sent to {recipientName}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="hero" className="w-full" onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}
