"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  HandCoins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery } from "@/lib/frontend/api-client";
import type { DashboardReport } from "@/lib/frontend/api-types";
import { money, periodLabel, currentPeriodKey, formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/status-badge";
import type { Member } from "@/lib/frontend/api-types";

function memberLabel(memberId: string, byId: Map<string, Member>): string {
  const member = byId.get(memberId);
  if (member) {
    return typeof member.userId === "object" ? member.userId.name : memberId.slice(-6);
  }
  return `Member ${memberId.slice(-6)}`;
}

export default function DashboardPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canViewMembers = can("members.view");
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());

  const { data, error, loading, reload } = useApiData<DashboardReport>(
    async () => {
      const report = await api.get<DashboardReport>(
        `/api/organizations/${orgId}/reports/dashboard${toQuery({ periodKey })}`
      );
      return report;
    },
    [orgId, periodKey]
  );

  const { data: members } = useApiData<{ items: Member[] }>(
    async () =>
      canViewMembers
        ? api.get<{ items: Member[] }>(`/api/organizations/${orgId}/members?limit=100`)
        : { items: [] },
    [orgId, canViewMembers]
  );
  const memberById = new Map((members?.items ?? []).map((m) => [m._id, m]));

  if (!currentOrg || !orgId) return null;

  const totals = data?.totals;
  const netOutstanding =
    totals ? totals.totalExpense - totals.totalPayments - totals.totalAdjustments : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${currentOrg.name}`}
        description={`Overview for ${periodLabel(periodKey)}`}
      >
        <MonthPicker
          className="w-44"
          value={periodKey}
          max={currentPeriodKey()}
          onChange={(val) => setPeriodKey(val || currentPeriodKey())}
        />
      </PageHeader>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingState rows={4} /> : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Total expense
                </CardDescription>
                <CardTitle className="text-2xl">{money(totals?.totalExpense)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals?.expenseCount ?? 0} expenses recorded
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <HandCoins className="h-3.5 w-3.5" /> Total payments
                </CardDescription>
                <CardTitle className="text-2xl">{money(totals?.totalPayments)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals?.paymentCount ?? 0} payments collected
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Adjustments
                </CardDescription>
                <CardTitle className="text-2xl">{money(totals?.totalAdjustments)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals?.adjustmentCount ?? 0} applied this period
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-2 text-sm">
            <span className="text-muted-foreground">Net outstanding: </span>
            <span className="ml-1 font-semibold">{money(netOutstanding)}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Member balances</CardTitle>
                <CardDescription>Net balance from the latest calculation</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topBalances.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No balances yet — run accounting for this period.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.topBalances.map((row) => {
                      const owes = row.netBalance > 0;
                      return (
                        <li key={row.organizationMemberId} className="flex items-center justify-between py-2.5">
                          <span className="text-sm">{memberLabel(row.organizationMemberId, memberById)}</span>
                          <span
                            className={`flex items-center gap-1 text-sm font-medium ${
                              owes ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {owes ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            {money(row.netBalance)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Recent expenses</CardTitle>
                  <CardDescription>Latest 5 entries in this period</CardDescription>
                </div>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/expenses" />}>
                  View all
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentExpenses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No expenses recorded this period.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.recentExpenses.map((expense) => (
                      <li key={expense._id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof expense.categoryId === "object"
                              ? expense.categoryId.name
                              : "Category"}{" "}
                            · {formatDate(expense.expenseDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={expense.status} />
                          <span className="text-sm font-semibold tabular-nums">
                            {money(expense.amount)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
