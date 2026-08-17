"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/money-input";
import { FieldError } from "@/components/auth-card";
import { api, ApiError } from "@/lib/frontend/api-client";
import { DISTRIBUTION_METHOD } from "@/lib/constants/enums";
import { todayInput, money } from "@/lib/frontend/format";
import type { Expense, Member } from "@/lib/frontend/api-types";

interface ParticipantRow {
  organizationMemberId: string;
  percent?: number;
  amount?: number;
}

interface ItemRow {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
}

const METHODS_REQUIRING_PARTICIPANTS: string[] = [
  DISTRIBUTION_METHOD.SELECTED_MEMBERS,
  DISTRIBUTION_METHOD.PERCENTAGE,
  DISTRIBUTION_METHOD.FIXED_AMOUNT,
  DISTRIBUTION_METHOD.INDIVIDUAL,
];

const SIMPLE_METHODS: Array<{ value: string; label: string }> = [
  { value: DISTRIBUTION_METHOD.EQUAL, label: "Equal share" },
  { value: DISTRIBUTION_METHOD.MEAL_BASED, label: "Meal based" },
  { value: DISTRIBUTION_METHOD.SELECTED_MEMBERS, label: "Selected members" },
];

const ADVANCED_METHODS: Array<{ value: string; label: string }> = [
  { value: DISTRIBUTION_METHOD.PERCENTAGE, label: "Percentage" },
  { value: DISTRIBUTION_METHOD.FIXED_AMOUNT, label: "Fixed amount" },
  { value: DISTRIBUTION_METHOD.INDIVIDUAL, label: "Individual" },
];

function memberName(member: Member): string {
  return typeof member.userId === "object" ? member.userId.name : member._id.slice(-6);
}

export function ExpenseForm({
  open,
  onOpenChange,
  orgId,
  members,
  categories,
  defaultPaidBy,
  expense,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  members: Member[];
  categories: Array<{ _id: string; name: string; isFood: boolean }>;
  defaultPaidBy: string;
  expense?: Expense | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(expense);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [description, setDescription] = useState(expense?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    (typeof expense?.categoryId === "object" ? expense.categoryId._id : expense?.categoryId) ?? categories[0]?._id ?? ""
  );
  const [amount, setAmount] = useState<number>(expense?.amount ?? 0);
  const [expenseDate, setExpenseDate] = useState(
    expense ? expense.expenseDate.slice(0, 10) : todayInput()
  );
  const [paidByMemberId, setPaidByMemberId] = useState(
    expense
      ? typeof expense.paidByMemberId === "object"
        ? expense.paidByMemberId._id
        : expense.paidByMemberId
      : defaultPaidBy
  );
  const [method, setMethod] = useState(expense?.distribution.method ?? DISTRIBUTION_METHOD.EQUAL);
  const [details, setDetails] = useState(expense?.distribution.details ?? "");
  const [participants, setParticipants] = useState<ParticipantRow[]>(() =>
    expense
      ? expense.distribution.participants.map((p) => ({
          organizationMemberId: p.organizationMemberId,
          percent: p.percent,
          amount: p.amount,
        }))
      : []
  );
  const [items, setItems] = useState<ItemRow[]>(expense?.items ?? []);
  const [statusPending, setStatusPending] = useState(
    isEdit ? expense?.status === "PENDING" : false
  );

  const itemTotalPaisa = useMemo(
    () =>
      items.reduce((sum, item) => {
        const lineTotal = item.total ?? (item.quantity && item.unitPrice ? item.quantity * item.unitPrice : 0);
        return sum + Math.round(lineTotal * 100);
      }, 0),
    [items]
  );

  const useItems = items.length > 0;
  const effectiveAmount = useItems ? itemTotalPaisa : amount;

  const addParticipant = () => {
    const available = members.filter(
      (m) => !participants.some((p) => p.organizationMemberId === m._id)
    );
    const next = available[0];
    if (!next) return;
    setParticipants([...participants, { organizationMemberId: next._id }]);
  };

  const updateParticipant = (index: number, patch: Partial<ParticipantRow>) => {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => setItems((prev) => [...prev, { name: "" }]);

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!categoryId) {
        throw new ApiError("VALIDATION_ERROR", "Please choose a category", 400);
      }
      if (effectiveAmount <= 0) {
        throw new ApiError("VALIDATION_ERROR", "Amount must be greater than zero", 400);
      }
      const body = {
        categoryId,
        description,
        amount: effectiveAmount,
        expenseDate,
        paidByMemberId,
        distribution: {
          method,
          participants: participants.map((p) => ({
            organizationMemberId: p.organizationMemberId,
            ...(method === DISTRIBUTION_METHOD.PERCENTAGE ? { percent: p.percent ?? 0 } : {}),
            ...(method === DISTRIBUTION_METHOD.FIXED_AMOUNT ? { amount: p.amount ?? 0 } : {}),
          })),
          details: details || undefined,
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        ...(statusPending ? { status: "PENDING" as const } : {}),
      };

      if (isEdit && expense) {
        await api.patch(`/api/organizations/${orgId}/expenses/${expense._id}`, body);
        toast.success("Expense updated");
      } else {
        await api.post(`/api/organizations/${orgId}/expenses`, body);
        toast.success("Expense added");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const needsParticipants = METHODS_REQUIRING_PARTICIPANTS.includes(method);
  const isAdvancedMethod = ADVANCED_METHODS.some((m) => m.value === method);
  const allMethods = [...SIMPLE_METHODS, ...(showAdvanced ? ADVANCED_METHODS : [])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Record an expense and choose how it is shared.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly grocery run"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)} items={categories.map((c) => ({ value: c._id, label: c.name }))}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                id="date"
                value={expenseDate}
                onChange={setExpenseDate}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paidBy">Paid by *</Label>
            <Select value={paidByMemberId} onValueChange={(value) => value && setPaidByMemberId(value)} items={members.map((m) => ({ value: m._id, label: memberName(m) + (m._id === defaultPaidBy ? " (you)" : "") }))}>
              <SelectTrigger id="paidBy" className="w-full">
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member._id} value={member._id}>
                    {memberName(member)}
                    {member._id === defaultPaidBy ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!useItems ? (
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount *</Label>
              <MoneyInput id="amount" value={amount} onChange={setAmount} />
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Amount (from items): </span>
              <span className="font-semibold">{money(itemTotalPaisa)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="method">How is it shared? *</Label>
            <Select value={method} onValueChange={(value) => value && setMethod(value)} items={allMethods}>
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allMethods.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!showAdvanced && !isAdvancedMethod ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvanced(true)}
              >
                Show advanced options
              </button>
            ) : null}
          </div>

          {method === DISTRIBUTION_METHOD.EQUAL || method === DISTRIBUTION_METHOD.MEAL_BASED ? (
            <p className="text-xs text-muted-foreground">
              {method === DISTRIBUTION_METHOD.MEAL_BASED
                ? "Split by meal units across all active members."
                : "Split equally across all members active on this date."}
            </p>
          ) : null}

          {needsParticipants ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Participants</Label>
                <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {participants.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  No participants selected.
                </p>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant, index) => {
                    const member = members.find((m) => m._id === participant.organizationMemberId);
                    return (
                      <div key={participant.organizationMemberId} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <Select
                            value={participant.organizationMemberId}
                            onValueChange={(value) =>
                              value && updateParticipant(index, { organizationMemberId: value })
                            }
                            items={members.map((m) => ({ value: m._id, label: memberName(m) }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m) => (
                                <SelectItem key={m._id} value={m._id}>
                                  {memberName(m)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {method === DISTRIBUTION_METHOD.PERCENTAGE ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20"
                            placeholder="%"
                            value={participant.percent ?? ""}
                            onChange={(e) =>
                              updateParticipant(index, { percent: Number(e.target.value) })
                            }
                          />
                        ) : null}
                        {method === DISTRIBUTION_METHOD.FIXED_AMOUNT ? (
                          <MoneyInput
                            className="w-32"
                            value={participant.amount ?? 0}
                            onChange={(paisa) => updateParticipant(index, { amount: paisa })}
                          />
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(index)}
                          aria-label="Remove participant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {member?._id === defaultPaidBy ? <span className="text-xs text-muted-foreground">(you)</span> : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {method === DISTRIBUTION_METHOD.PERCENTAGE ? (
                <p className="text-xs text-muted-foreground">
                  Percentages must total exactly 100. Current:{" "}
                  {participants.reduce((sum, p) => sum + (p.percent ?? 0), 0)}
                </p>
              ) : null}
              {method === DISTRIBUTION_METHOD.FIXED_AMOUNT ? (
                <p className="text-xs text-muted-foreground">
                  Participant amounts must total the expense amount. Current:{" "}
                  {money(participants.reduce((sum, p) => sum + (p.amount ?? 0), 0))}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-md border py-2 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showMore ? "Less options" : "More options"}
          </button>

          {showMore ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items (bazar / grocery)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="rounded-lg border p-2">
                        <div className="mb-2 flex items-center gap-2">
                          <Input
                            className="flex-1"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Qty"
                            value={item.quantity ?? ""}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || undefined })}
                          />
                          <Input
                            placeholder="Unit"
                            value={item.unit ?? ""}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                          />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Price"
                            value={item.unitPrice ?? ""}
                            onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || undefined })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="details">Notes</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="pending"
                  checked={statusPending}
                  onCheckedChange={setStatusPending}
                />
                <Label htmlFor="pending" className="text-sm font-normal">
                  Save as pending approval
                </Label>
              </div>
            </div>
          ) : null}

          <FieldError message={error ?? undefined} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
