"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingCart, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { Expense, ExpenseCategory, Member } from "@/lib/frontend/api-types";
import { money, formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { todayInput } from "@/lib/frontend/format";
import { FieldError } from "@/components/auth-card";
import { ApiError } from "@/lib/frontend/api-client";

interface BazarItem {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

function ItemCard({
  item,
  index,
  total,
  canRemove,
  onUpdate,
  onRemove,
}: {
  item: BazarItem;
  index: number;
  total: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<BazarItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {index + 1}
        </span>
        <Input
          placeholder="What did you buy?"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1"
          required
        />
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={item.quantity ?? ""}
            onChange={(e) => onUpdate({ quantity: Number(e.target.value) || undefined })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unit</Label>
          <Input
            placeholder="kg, pcs"
            value={item.unit ?? ""}
            onChange={(e) => onUpdate({ unit: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={item.unitPrice ?? ""}
            onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      {total > 0 ? (
        <div className="flex justify-end">
          <span className="text-sm font-medium text-primary">{money(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function BazarPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canCreate = can("expenses.create");

  const [items, setItems] = useState<BazarItem[]>([{ name: "" }]);
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: categories } = useApiData<ExpenseCategory[]>(
    async () => api.get<ExpenseCategory[]>(`/api/organizations/${orgId}/expense-categories`),
    [orgId]
  );

  const { data: members } = useApiData<ApiListData<Member>>(
    async () =>
      can("members.view")
        ? api.get<ApiListData<Member>>(`/api/organizations/${orgId}/members?limit=100`)
        : { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    [orgId, can("members.view")]
  );

  const { data: bazar, loading, error: listError, reload } = useApiData<ApiListData<Expense>>(
    async () =>
      api.get<ApiListData<Expense>>(
        `/api/organizations/${orgId}/expenses${toQuery({
          page: 1,
          limit: 10,
          categoryId,
        })}`
      ),
    [orgId, categoryId]
  );

  const activeMembers = (members?.items ?? []).filter((m) => m.status === "ACTIVE");
  const foodCategories = (categories ?? []).filter((c) => c.isFood);

  const effectiveCategoryId = categoryId || foodCategories[0]?._id || "";
  const effectivePaidBy = paidBy || currentOrg?.memberId || "";

  const totalPaisa = items.reduce(
    (sum, item) => sum + (item.unitPrice && item.quantity ? Math.round(item.unitPrice * item.quantity * 100) : 0),
    0
  );

  const updateItem = (index: number, patch: Partial<BazarItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { name: "" }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const filled = items.filter((item) => item.name.trim());
      if (filled.length === 0) {
        throw new ApiError("VALIDATION_ERROR", "Add at least one item", 400);
      }
      const amount = filled.reduce(
        (sum, item) => sum + (item.unitPrice && item.quantity ? Math.round(item.unitPrice * item.quantity * 100) : 0),
        0
      );
      if (amount <= 0) {
        throw new ApiError("VALIDATION_ERROR", "Enter quantities and prices for the items", 400);
      }
      const cat = categoryId || foodCategories[0]?._id || categories?.[0]?._id;
      if (!cat) {
        throw new ApiError("VALIDATION_ERROR", "No expense category available", 400);
      }
      await api.post(`/api/organizations/${orgId}/expenses`, {
        categoryId: cat,
        description: `Bazar · ${formatDate(date)}`,
        amount,
        expenseDate: date,
        paidByMemberId: paidBy || currentOrg?.memberId,
        distribution: { method: "MEAL_BASED", participants: [], details: notes || undefined },
        items: filled.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          total: item.quantity && item.unitPrice ? item.quantity * item.unitPrice : undefined,
        })),
      });
      toast.success("Bazar added — split by meals");
      setItems([{ name: "" }]);
      setNotes("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!currentOrg) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bazar"
        description="Daily grocery shopping — split fairly by meals"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> New bazar
            </CardTitle>
            <CardDescription>Add the groceries you bought today.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                {items.map((item, index) => (
                  <ItemCard
                    key={index}
                    item={item}
                    index={index}
                    total={item.unitPrice && item.quantity ? Math.round(item.unitPrice * item.quantity * 100) : 0}
                    canRemove={items.length > 1}
                    onUpdate={(patch) => updateItem(index, patch)}
                    onRemove={() => removeItem(index)}
                  />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add item
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={effectiveCategoryId} onValueChange={(value) => value && setCategoryId(value)} items={foodCategories.map((c) => ({ value: c._id, label: c.name }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {foodCategories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <DatePicker value={date} onChange={setDate} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Paid by</Label>
                <Select value={effectivePaidBy} onValueChange={(value) => value && setPaidBy(value)} items={(activeMembers.length > 0 ? activeMembers : [{ _id: currentOrg.memberId } as Member]).map((m) => ({ value: m._id, label: m._id === currentOrg.memberId ? "Me (you)" : (typeof m.userId === "object" ? m.userId.name : m._id.slice(-6)) }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeMembers.length > 0
                      ? activeMembers
                      : [{ _id: currentOrg.memberId } as Member]
                    ).map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member._id === currentOrg.memberId
                          ? "Me (you)"
                          : (typeof member.userId === "object" ? member.userId.name : member._id.slice(-6))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes about this bazar"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-4">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums text-primary">{money(totalPaisa)}</span>
              </div>

              <FieldError message={error ?? undefined} />
              <Button type="submit" className="w-full" disabled={busy || !canCreate}>
                {busy ? "Adding…" : "Add bazar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Recent bazar
            </CardTitle>
            <CardDescription>Latest grocery expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {listError ? <ErrorState message={listError.message} onRetry={reload} /> : null}
            {loading && !bazar ? <LoadingState rows={4} /> : null}
            {bazar && bazar.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No bazar recorded yet.</p>
            ) : null}
            {bazar && bazar.items.length > 0 ? (
              <div className="space-y-3">
                {bazar.items.map((expense) => (
                  <div key={expense._id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.expenseDate)} · {expense.items.length} items
                        </p>
                      </div>
                      <StatusBadge status={expense.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {expense.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                            {item.name}
                          </span>
                        ))}
                        {expense.items.length > 3 ? (
                          <span className="text-xs text-muted-foreground">+{expense.items.length - 3} more</span>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{money(expense.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
