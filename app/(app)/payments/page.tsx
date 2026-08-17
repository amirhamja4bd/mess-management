"use client";

import { useState } from "react";
import { Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { Payment, PaymentMethod, Member } from "@/lib/frontend/api-types";
import { money, formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/state";
import { Pagination } from "@/components/pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MoneyInput } from "@/components/money-input";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import { todayInput } from "@/lib/frontend/format";

interface ContributionRow {
  organizationMemberId: string;
  name: string;
  totalContribution: number;
  totalAdvance: number;
  totalSettlementPaid: number;
  totalRefund: number;
  paymentCount: number;
}

const PAYMENT_TYPES = [
  { value: "CONTRIBUTION", label: "Contribution" },
  { value: "ADVANCE", label: "Advance" },
  { value: "REFUND", label: "Refund" },
  { value: "CREDIT", label: "Credit" },
];

export default function PaymentsPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canCreate = can("payments.create");
  const canEdit = can("payments.edit");
  const canViewMembers = can("members.view");

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);

  const { data, error, loading, reload } = useApiData<ApiListData<Payment>>(
    async () =>
      api.get<ApiListData<Payment>>(
        `/api/organizations/${orgId}/payments${toQuery({ page, limit: 20 })}`
      ),
    [orgId, page]
  );

  const { data: summary } = useApiData<ContributionRow[]>(
    async () => api.get<ContributionRow[]>(`/api/organizations/${orgId}/payments/summary`),
    [orgId]
  );

  const { data: methods } = useApiData<PaymentMethod[]>(
    async () => api.get<PaymentMethod[]>(`/api/organizations/${orgId}/payment-methods`),
    [orgId]
  );

  const { data: members } = useApiData<ApiListData<Member>>(
    async () =>
      canViewMembers
        ? api.get<ApiListData<Member>>(`/api/organizations/${orgId}/members?limit=100`)
        : { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    [orgId, canViewMembers]
  );

  const activeMembers = (members?.items ?? []).filter((m) => m.status === "ACTIVE");
  const selfMember = activeMembers.find((m) => m._id === currentOrg?.memberId) ?? null;

  const totalCollected = (summary ?? []).reduce(
    (sum, row) => sum + row.totalContribution + row.totalAdvance,
    0
  );

  const handleVoid = async () => {
    if (!voiding) return;
    try {
      await api.delete(`/api/organizations/${orgId}/payments/${voiding._id}`, {
        reason: "Voided from UI",
      });
      toast.success("Payment voided");
      setVoiding(null);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to void payment");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Contributions, advances and refunds">
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Record payment
          </Button>
        ) : null}
      </PageHeader>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}

      {summary && summary.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{money(totalCollected)}</p>
            </CardContent>
          </Card>
          {summary.slice(0, 3).map((row) => (
            <Card key={row.organizationMemberId}>
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-sm font-medium text-muted-foreground">
                  {row.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{money(row.totalContribution)}</p>
                <p className="text-xs text-muted-foreground">{row.paymentCount} payments</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {loading && !data ? <LoadingState /> : null}
      {data && data.items.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Record the first contribution to get started."
          action={
            canCreate ? (
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Record payment
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
                  <TableHead>Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit && canViewMembers) ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell className="font-medium">
                      {typeof payment.organizationMemberId === "object" &&
                      payment.organizationMemberId.userId &&
                      typeof payment.organizationMemberId.userId === "object"
                        ? payment.organizationMemberId.userId.name
                        : "Member"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{payment.type.toLowerCase().replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>{payment.methodName ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {money(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    {(canEdit && canViewMembers) ? (
                      <TableCell className="text-right">
                        {payment.status !== "VOIDED" ? (
                          <Button variant="ghost" size="sm" onClick={() => setVoiding(payment)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
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

      <PaymentForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId ?? ""}
        members={activeMembers}
        selfMemberId={selfMember?._id ?? currentOrg?.memberId ?? ""}
        methods={methods ?? []}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(voiding)}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void this payment?"
        description={`A ${money(voiding?.amount ?? 0)} payment will be excluded from accounting.`}
        confirmLabel="Void payment"
        onConfirm={handleVoid}
      />
    </div>
  );
}

function PaymentForm({
  open,
  onOpenChange,
  orgId,
  members,
  selfMemberId,
  methods,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  members: Member[];
  selfMemberId: string;
  methods: PaymentMethod[];
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(todayInput());
  const [methodId, setMethodId] = useState("");
  const [type, setType] = useState("CONTRIBUTION");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const effectiveMemberId = memberId || (members.some((m) => m._id === selfMemberId) ? selfMemberId : "");
  const effectiveMethodId = methodId || methods[0]?._id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (amount <= 0) {
        throw new ApiError("VALIDATION_ERROR", "Amount must be greater than zero", 400);
      }
      const method = methods.find((m) => m._id === effectiveMethodId);
      await api.post(`/api/organizations/${orgId}/payments`, {
        organizationMemberId: effectiveMemberId,
        amount,
        paymentDate: date,
        methodId: method?._id ?? null,
        methodName: method?.name,
        type,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success("Payment recorded");
      setAmount(0);
      setReference("");
      setNotes("");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Log a contribution, advance or refund.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Select value={effectiveMemberId} onValueChange={(value) => value && setMemberId(value)} items={members.map((m) => ({ value: m._id, label: (typeof m.userId === "object" ? m.userId.name : m._id.slice(-6)) + (m._id === selfMemberId ? " (you)" : "") }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member._id} value={member._id}>
                    {(typeof member.userId === "object" ? member.userId.name : member._id.slice(-6))}
                    {member._id === selfMemberId ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => value && setType(value)} items={PAYMENT_TYPES}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={effectiveMethodId} onValueChange={(value) => value && setMethodId(value)} items={methods.map((m) => ({ value: m._id, label: m.name }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((method) => (
                    <SelectItem key={method._id} value={method._id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction ID, receipt number…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <p className="text-xs text-rose-600">{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
