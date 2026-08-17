import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANT_BY_STATUS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  PAID: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  CONSUMED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  OPEN: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  CALCULATING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PARTIALLY_PAID: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  SUSPENDED: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  PENDING_VERIFICATION: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  VOIDED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  CLOSED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  ARCHIVED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  FINALIZED: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  REFUNDED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  UNAVAILABLE: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  AWAY: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  ADJUSTED: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  NOT_CONSUMED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  LEFT: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  REJECTED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  EXPIRED: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  CREDIT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  DEBIT: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  ADVANCE: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  CONTRIBUTION: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  SETTLEMENT_PAYMENT: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", VARIANT_BY_STATUS[status] ?? "text-muted-foreground", className)}
    >
      {status.toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}
