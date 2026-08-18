"use client";

import { Pencil, XCircle, CheckCircle2, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { money, methodLabel, formatDate, formatDateTime } from "@/lib/frontend/format";
import type { Expense, Member } from "@/lib/frontend/api-types";

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

function memberName(member: Member): string {
  return typeof member.userId === "object" ? member.userId.name : member._id.slice(-6);
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

export function ExpenseViewDialog({
  open,
  onOpenChange,
  expense,
  members,
  canEdit,
  canApprove,
  canDelete,
  onEdit,
  onApprove,
  onVoid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  members: Member[];
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  onEdit: (expense: Expense) => void;
  onApprove: (expense: Expense) => void;
  onVoid: (expense: Expense) => void;
}) {
  if (!expense) return null;

  const hasItems = expense.items.length > 0;
  const hasParticipants = expense.distribution.participants.length > 0;
  const method = expense.distribution.method;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details for {expense.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto py-1">
          {/* Amount + Status */}
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold tabular-nums">{money(expense.amount)}</span>
            <StatusBadge status={expense.status} />
          </div>

          {/* Description */}
          <div>
            <p className="font-medium">{expense.description}</p>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-0.5">
            <InfoRow label="Category">{categoryName(expense)}</InfoRow>
            <InfoRow label="Date">{formatDate(expense.expenseDate)}</InfoRow>
            <InfoRow label="Paid by">{payerName(expense)}</InfoRow>
            <InfoRow label="Sharing">{methodLabel(method)}</InfoRow>
          </div>

          {/* Items */}
          {hasItems ? (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Items ({expense.items.length})
                </p>
                <div className="rounded-lg border divide-y">
                  {expense.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        {(item.quantity || item.unit) && (
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                            {item.unitPrice ? ` × ${money(Math.round(item.unitPrice * 100))}` : ""}
                          </p>
                        )}
                      </div>
                      <span className="ml-3 tabular-nums font-medium">
                        {money(Math.round((item.total ?? (item.quantity && item.unitPrice ? item.quantity * item.unitPrice : 0)) * 100))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Participants */}
          {hasParticipants ? (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Participants ({expense.distribution.participants.length})
                </p>
                <div className="space-y-1">
                  {expense.distribution.participants.map((p, i) => {
                    const memberId =
                      typeof p.organizationMemberId === "string"
                        ? p.organizationMemberId
                        : p.organizationMemberId;
                    const member = members.find((m) => m._id === memberId);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span>{member ? memberName(member) : memberId}</span>
                        <span className="text-muted-foreground">
                          {method === "PERCENTAGE" && p.percent != null
                            ? `${p.percent}%`
                            : method === "FIXED_AMOUNT" && p.amount != null
                              ? money(p.amount)
                              : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {/* Notes */}
          {expense.distribution.details ? (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{expense.distribution.details}</p>
              </div>
            </>
          ) : null}

          {/* Void info */}
          {expense.status === "VOIDED" && expense.voidReason ? (
            <>
              <Separator />
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/30">
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Void reason</p>
                <p className="text-sm text-rose-600 dark:text-rose-300">{expense.voidReason}</p>
              </div>
            </>
          ) : null}

          {/* Approval info */}
          {expense.status === "APPROVED" && expense.approvedAt ? (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Approved {formatDateTime(expense.approvedAt)}
              </p>
            </>
          ) : null}

          {/* Audit */}
          {expense.createdAt ? (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Created {formatDateTime(expense.createdAt)}
              </p>
            </>
          ) : null}
        </div>

        <DialogFooter>
          {canApprove && expense.status === "PENDING" ? (
            <Button variant="outline" size="sm" onClick={() => onApprove(expense)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> Approve
            </Button>
          ) : null}
          {canEdit && expense.status !== "VOIDED" ? (
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(expense); }}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          ) : null}
          {canDelete && expense.status !== "VOIDED" ? (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onOpenChange(false); onVoid(expense); }}>
              <XCircle className="mr-1.5 h-4 w-4" /> Void
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
