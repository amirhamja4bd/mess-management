"use client";

import { useState } from "react";
import {
  Calculator,
  Lock,
  PackageCheck,
  Receipt,
  Utensils,
  Users,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery } from "@/lib/frontend/api-client";
import type { MonthlyCycle, MemberMonthlySummary } from "@/lib/frontend/api-types";
import { money, periodLabel, formatDate, currentPeriodKey } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/frontend/api-client";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MonthlySummaryReport {
  periodKey: string;
  cycle: MonthlyCycle | null;
  members: MemberMonthlySummary[];
  totals: {
    totalExpense: number;
    totalPayments: number;
    totalAdjustments: number;
  };
}

const CYCLE_STEPS = ["OPEN", "CALCULATED", "FINALIZED", "CLOSED"] as const;
const STEP_LABELS: Record<string, string> = {
  OPEN: "Open",
  CALCULATED: "Calculated",
  FINALIZED: "Finalized",
  CLOSED: "Closed",
};
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  OPEN: Receipt,
  CALCULATED: Calculator,
  FINALIZED: Lock,
  CLOSED: PackageCheck,
};

function CycleStepper({ status }: { status: string }) {
  const currentIdx = CYCLE_STEPS.indexOf(status as (typeof CYCLE_STEPS)[number]);
  return (
    <div className="flex items-center gap-1">
      {CYCLE_STEPS.map((step, i) => {
        const done = i <= currentIdx && currentIdx >= 0;
        const active = i === currentIdx && currentIdx >= 0;
        const Icon = STEP_ICONS[step];
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  i <= currentIdx && currentIdx >= 0
                    ? "text-primary"
                    : "text-muted-foreground/30"
                )}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : done
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground/50"
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", color)} /> {label}
        </CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      {sub ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function AccountingPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canFinalize = can("accounting.finalize");
  const canClose = can("accounting.close");

  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [busy, setBusy] = useState<"calculate" | "finalize" | "close" | null>(null);

  const { data, error, loading, reload } = useApiData<MonthlySummaryReport>(
    async () =>
      api.get<MonthlySummaryReport>(
        `/api/organizations/${orgId}/reports/monthly-summary${toQuery({ periodKey })}`
      ),
    [orgId, periodKey]
  );

  const cycle = data?.cycle ?? null;
  const members = data?.members ?? [];

  const runAction = async (action: "calculate" | "finalize" | "close") => {
    if (!cycle) return;
    setBusy(action);
    try {
      await api.post(
        `/api/organizations/${orgId}/monthly-cycles/${cycle._id}/${action}`
      );
      toast.success(
        action === "calculate"
          ? "Calculation complete"
          : action === "finalize"
            ? "Period finalized"
            : "Period closed"
      );
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const generateSettlement = async () => {
    if (!cycle) return;
    try {
      await api.post(`/api/organizations/${orgId}/settlements`, { cycleId: cycle._id });
      toast.success("Settlement generated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate settlement");
    }
  };

  if (!currentOrg) return null;

  const canSettle = can("settlement.manage");

  const nextAction = (() => {
    if (!cycle) return null;
    if (canFinalize && cycle.status === "OPEN" && !cycle.calculatedAt)
      return { key: "calculate" as const, label: "Calculate", icon: Calculator };
    if (canFinalize && cycle.status === "OPEN" && cycle.calculatedAt)
      return { key: "finalize" as const, label: "Finalize period", icon: Lock };
    if (canClose && cycle.status === "FINALIZED")
      return { key: "close" as const, label: "Close period", icon: PackageCheck };
    if (canSettle && (cycle.status === "FINALIZED" || cycle.status === "CLOSED"))
      return { key: "settle" as const, label: "Generate settlement", icon: Sparkles };
    return null;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly accounting"
        description={`Accounting for ${periodLabel(periodKey)}`}
      >
        <MonthPicker
          className="w-44"
          value={periodKey}
          onChange={(val) => setPeriodKey(val || currentPeriodKey())}
        />
      </PageHeader>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingState /> : null}

      {data && !cycle ? (
        <EmptyState title="No cycle for this period" description="This period hasn't started yet." />
      ) : null}

      {data && cycle ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{periodLabel(cycle.periodKey)}</CardTitle>
                    <StatusBadge status={cycle.status} />
                  </div>
                  <CardDescription>
                    {formatDate(cycle.startDate)} → {formatDate(cycle.endDate)}
                    {cycle.calculatedAt
                      ? ` · Calculated ${formatDate(cycle.calculatedAt)}`
                      : ""}
                  </CardDescription>
                </div>
                <CycleStepper status={cycle.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Receipt}
                  label="Total expense"
                  value={money(cycle.totals.totalExpense)}
                  color="text-rose-500"
                />
                <StatCard
                  icon={Utensils}
                  label="Food"
                  value={money(cycle.totals.foodExpense)}
                  color="text-amber-500"
                />
                <StatCard
                  icon={Users}
                  label="Common"
                  value={money(cycle.totals.commonExpense)}
                  color="text-sky-500"
                />
                <StatCard
                  icon={HandCoins}
                  label="Payments"
                  value={money(cycle.totals.totalPayments)}
                  color="text-emerald-500"
                />
              </div>
            </CardContent>

            {nextAction && (
              <div className="flex items-center gap-2 border-t px-4 py-3">
                {nextAction.key === "settle" ? (
                  <Button
                    onClick={() => void generateSettlement()}
                    disabled={busy !== null}
                  >
                    <nextAction.icon className="mr-1.5 h-4 w-4" />
                    {nextAction.label}
                  </Button>
                ) : (
                  <Button
                    onClick={() => void runAction(nextAction.key)}
                    disabled={busy !== null}
                  >
                    <nextAction.icon className="mr-1.5 h-4 w-4" />
                    {busy === nextAction.key
                      ? `${nextAction.label.replace("…", "")}ing…`
                      : nextAction.label}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {nextAction.key === "calculate" && "Run calculations on expenses and meals"}
                  {nextAction.key === "finalize" && "Lock period — no more edits allowed"}
                  {nextAction.key === "close" && "Close period for settlement generation"}
                  {nextAction.key === "settle" && "Resolve who owes whom"}
                </span>
              </div>
            )}
          </Card>

          {members.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Member shares</CardTitle>
                    <CardDescription>
                      Each member&apos;s liability, payment and net balance for this period.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/settlements" />}
                  >
                    Manage settlements
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Food</TableHead>
                      <TableHead className="text-right">Common</TableHead>
                      <TableHead className="text-right">Individual</TableHead>
                      <TableHead className="text-right">Liability</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Net balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((summary) => {
                      const member = summary.organizationMemberId;
                      const name =
                        typeof member === "object" &&
                        member.userId &&
                        typeof member.userId === "object"
                          ? member.userId.name
                          : "Member";
                      const net = summary.totals.netBalance;
                      const owes = net > 0;
                      return (
                        <TableRow key={summary._id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(summary.totals.foodShare)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(summary.totals.commonShare)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(summary.totals.individualShare)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(summary.totals.totalLiability)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(summary.totals.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                                owes
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : net < 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {owes ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : net < 0 ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : null}
                              {money(net)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
