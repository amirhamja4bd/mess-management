"use client";

import { useState } from "react";
import { Plus, Pencil, XCircle, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { Expense, ExpenseCategory, Member } from "@/lib/frontend/api-types";
import { money, methodLabel, formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/state";
import { Pagination } from "@/components/pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseViewDialog } from "@/components/expense-view-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function payerName(expense: Expense): string {
  const paidBy = expense.paidByMemberId;
  if (typeof paidBy === "object" && paidBy.userId && typeof paidBy.userId === "object") {
    return paidBy.userId.name;
  }
  return "Member";
}

function categoryName(expense: Expense): string {
  return typeof expense.categoryId === "object" ? expense.categoryId.name : "Category";
}

export default function ExpensesPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canCreate = can("expenses.create");
  const canEdit = can("expenses.edit");
  const canDelete = can("expenses.delete");
  const canApprove = can("expenses.approve");
  const canViewMembers = can("members.view");

  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [viewing, setViewing] = useState<Expense | null>(null);

  const { data, error, loading, reload } = useApiData<ApiListData<Expense>>(
    async () =>
      api.get<ApiListData<Expense>>(
        `/api/organizations/${orgId}/expenses${toQuery({
          page,
          limit: 20,
          categoryId: categoryFilter || undefined,
          status: statusFilter || undefined,
        })}`
      ),
    [orgId, page, categoryFilter, statusFilter]
  );

  const { data: categories } = useApiData<ExpenseCategory[]>(
    async () => api.get<ExpenseCategory[]>(`/api/organizations/${orgId}/expense-categories`),
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

  const handleApprove = async (expense: Expense) => {
    try {
      await api.post(`/api/organizations/${orgId}/expenses/${expense._id}/approve`);
      toast.success("Expense approved");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleVoid = async () => {
    if (!voiding) return;
    try {
      await api.delete(`/api/organizations/${orgId}/expenses/${voiding._id}`, { reason: "Voided from UI" });
      toast.success("Expense voided");
      setVoiding(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void expense");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="All recorded expenses for your organization">
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add expense
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={(v) => { if (v !== null) setCategoryFilter(v); setPage(1); }} items={[{ value: "", label: "All categories" }, ...(categories ?? []).map((c) => ({ value: c._id, label: c.name }))]}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category._id} value={category._id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v); setPage(1); }} items={[{ value: "", label: "All statuses" }, { value: "APPROVED", label: "Approved" }, { value: "PENDING", label: "Pending" }, { value: "VOIDED", label: "Voided" }]}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingState /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description="Add your first expense to start tracking."
          action={
            canCreate ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add expense
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Paid by</TableHead>
                  <TableHead className="hidden lg:table-cell">Sharing</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell className="max-w-[220px]">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setViewing(expense)}
                      >
                        <p className="truncate font-medium">{expense.description}</p>
                      </button>
                      <p className="text-xs text-muted-foreground sm:hidden">{categoryName(expense)} · {formatDate(expense.expenseDate)}</p>
                      {expense.items.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{expense.items.length} items</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{categoryName(expense)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="hidden md:table-cell">{payerName(expense)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{methodLabel(expense.distribution.method)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {money(expense.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge status={expense.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                            Actions
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewing(expense)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {(canApprove && expense.status === "PENDING") ? (
                              <DropdownMenuItem onClick={() => void handleApprove(expense)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Approve
                              </DropdownMenuItem>
                            ) : null}
                            {(canEdit && expense.status !== "VOIDED") ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(expense);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            ) : null}
                            {(canDelete && expense.status !== "VOIDED") ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setVoiding(expense)}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Void
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onChange={setPage}
          />
        </>
      ) : null}

      {/* Add/Edit Form */}
      {formOpen ? (
        <ExpenseForm
          open={formOpen}
          onOpenChange={setFormOpen}
          orgId={orgId ?? ""}
          members={activeMembers}
          categories={categories ?? []}
          defaultPaidBy={currentOrg?.memberId ?? ""}
          expense={editing}
          onSaved={reload}
        />
      ) : null}

      {/* View Detail Modal */}
      <ExpenseViewDialog
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        expense={viewing}
        members={activeMembers}
        canEdit={canEdit}
        canApprove={canApprove}
        canDelete={canDelete}
        onEdit={(expense) => { setEditing(expense); setFormOpen(true); }}
        onApprove={handleApprove}
        onVoid={(expense) => setVoiding(expense)}
      />

      {/* Void Confirm */}
      <ConfirmDialog
        open={Boolean(voiding)}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void this expense?"
        description={`"${voiding?.description}" for ${money(voiding?.amount ?? 0)} will be excluded from accounting.`}
        confirmLabel="Void expense"
        onConfirm={handleVoid}
      />
    </div>
  );
}
