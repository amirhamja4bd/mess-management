"use client";

import { useState } from "react";
import { Plus, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { Settlement, SettlementTransaction, MonthlyCycle } from "@/lib/frontend/api-types";
import { money, formatDate, periodLabel } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/state";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/frontend/api-client";

function memberName(member: unknown): string {
  if (member && typeof member === "object") {
    const record = member as Record<string, unknown>;
    const userId = record.userId;
    if (userId && typeof userId === "object") {
      const name = (userId as Record<string, unknown>).name;
      if (typeof name === "string") return name;
    }
  }
  return "Member";
}

export default function SettlementsPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canManage = can("settlement.manage");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Settlement | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [busyTx, setBusyTx] = useState<string | null>(null);

  const { data, error, loading, reload } = useApiData<ApiListData<Settlement>>(
    async () =>
      api.get<ApiListData<Settlement>>(
        `/api/organizations/${orgId}/settlements${toQuery({ page, limit: 20 })}`
      ),
    [orgId, page]
  );

  const { data: detail, reload: reloadDetail } = useApiData<{
    settlement: Settlement;
    transactions: SettlementTransaction[];
  }>(async () => api.get(`/api/organizations/${orgId}/settlements/${selected?._id}`), [orgId, selected?._id]);

  const markPaid = async (transaction: SettlementTransaction, paid: boolean) => {
    setBusyTx(transaction._id);
    try {
      await api.post(
        `/api/organizations/${orgId}/settlements/transactions/${transaction._id}/${paid ? "paid" : "unpaid"}`
      );
      toast.success(paid ? "Transaction marked as paid" : "Transaction re-opened");
      reloadDetail();
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update transaction");
    } finally {
      setBusyTx(null);
    }
  };

  const pendingCount = detail?.transactions.filter((t) => t.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Settlements" description="Resolve who owes whom after a finalized period">
        {canManage ? (
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Generate settlement
          </Button>
        ) : null}
      </PageHeader>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingState /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          description="Finalize a monthly period, then generate a settlement to resolve balances."
          action={
            canManage ? (
              <Button variant="outline" onClick={() => setGenerateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Generate settlement
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total owed</TableHead>
                  <TableHead className="text-right">Total receivable</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((settlement) => {
                  const cycle =
                    typeof settlement.cycleId === "object" ? settlement.cycleId : null;
                  return (
                    <TableRow key={settlement._id}>
                      <TableCell className="font-medium">
                        {cycle && typeof cycle === "object" ? periodLabel((cycle as { periodKey?: string }).periodKey ?? "") : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={settlement.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(settlement.totalOwed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(settlement.totalReceivable)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(settlement.generatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(settlement)}>
                          {selected?._id === settlement._id ? "Open" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onChange={setPage}
          />
        </>
      ) : null}

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        orgId={orgId}
        onSaved={() => {
          setGenerateOpen(false);
          reload();
        }}
      />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transactions</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.transactions.length} items · ${pendingCount} pending` : "Loading…"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {!detail ? <LoadingState /> : null}
            {detail && detail.transactions.length === 0 ? (
              <EmptyState title="No transactions" description="This settlement has no transfers yet." />
            ) : null}
            {detail?.transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {memberName(transaction.fromMemberId)} → {memberName(transaction.toMemberId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <StatusBadge status={transaction.status} />{" "}
                    {transaction.paidAt ? `paid ${formatDate(transaction.paidAt)}` : "not yet paid"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums">{money(transaction.amount)}</span>
                  {canManage ? (
                    transaction.status === "PENDING" ? (
                      <Button size="sm" variant="outline" onClick={() => void markPaid(transaction, true)} disabled={busyTx === transaction._id}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Mark paid
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => void markPaid(transaction, false)} disabled={busyTx === transaction._id}>
                        <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
  orgId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | undefined;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState("");

  const { data: cycles } = useApiData<ApiListData<MonthlyCycle>>(
    async () =>
      open && orgId
        ? api.get<ApiListData<MonthlyCycle>>(
            `/api/organizations/${orgId}/monthly-cycles${toQuery({ limit: 50 })}`
          )
        : { items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
    [orgId, open]
  );

  const eligible = (cycles?.items ?? []).filter(
    (cycle) => cycle.status === "FINALIZED" || cycle.status === "CLOSED"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId || !orgId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/organizations/${orgId}/settlements`, { cycleId });
      toast.success("Settlement generated");
      setCycleId("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate settlement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate settlement</DialogTitle>
          <DialogDescription>
            Pick a finalized or closed period. Debts and credits are resolved between members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-1.5">
              <Label>Period</Label>
            <Select value={cycleId} onValueChange={(value) => value && setCycleId(value)} items={eligible.map((c) => ({ value: c._id, label: `${periodLabel(c.periodKey)} · ${money(c.totals?.totalExpense ?? 0)}` }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a finalized period…" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((cycle) => (
                  <SelectItem key={cycle._id} value={cycle._id}>
                    {periodLabel(cycle.periodKey)} · {money(cycle.totals?.totalExpense ?? 0)}
                    </SelectItem>
                  ))}
                  {eligible.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No finalized periods yet
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-rose-600">{error}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !cycleId}>
              {busy ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
