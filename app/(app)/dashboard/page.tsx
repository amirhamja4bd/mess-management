"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  HandCoins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Users,
  Utensils,
  PieChart as PieChartIcon,
  BarChart3,
  CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery } from "@/lib/frontend/api-client";
import type {
  DashboardReport,
  ExpenseCategoryTotalsReport,
  HistoricalComparisonReport,
  MealAnalyticsReport,
  PaymentSummaryReport,
  Member,
} from "@/lib/frontend/api-types";
import { money, periodLabel, currentPeriodKey, formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
];

function memberLabel(memberId: string, byId: Map<string, Member>): string {
  const member = byId.get(memberId);
  if (member) {
    return typeof member.userId === "object" ? member.userId.name : memberId.slice(-6);
  }
  return `Member ${memberId.slice(-6)}`;
}

function Delta({ value, invert }: { value: number; invert?: boolean }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">0</span>;
  const positive = value > 0;
  const good = invert ? !positive : positive;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{money(value)}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{money(Math.round(entry.value * 100))}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canViewMembers = can("members.view");
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());

  const query = toQuery({ periodKey });

  const { data, error, loading, reload } = useApiData<DashboardReport>(
    async () => api.get<DashboardReport>(`/api/organizations/${orgId}/reports/dashboard${query}`),
    [orgId, periodKey]
  );

  const { data: categoryData } = useApiData<ExpenseCategoryTotalsReport>(
    async () => api.get(`/api/organizations/${orgId}/reports/expense-category-totals${query}`),
    [orgId, periodKey]
  );

  const { data: historyData } = useApiData<HistoricalComparisonReport>(
    async () => api.get(`/api/organizations/${orgId}/reports/historical-comparison${query}`),
    [orgId, periodKey]
  );

  const { data: mealData } = useApiData<MealAnalyticsReport>(
    async () => api.get(`/api/organizations/${orgId}/reports/meal-analytics${query}`),
    [orgId, periodKey]
  );

  const { data: paymentData } = useApiData<PaymentSummaryReport>(
    async () => api.get(`/api/organizations/${orgId}/reports/payment-summary${query}`),
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
  const hist = historyData;

  // Pie chart data
  const categoryPieData = (categoryData?.breakdown ?? []).map((b) => ({
    name: b.name,
    value: b.total / 100,
    percent: b.percent,
  }));

  // Bar chart data
  const comparisonBarData = hist
    ? [
        { name: "Expenses", current: hist.current.totalExpense / 100, previous: hist.previous.totalExpense / 100 },
        { name: "Payments", current: hist.current.totalPayments / 100, previous: hist.previous.totalPayments / 100 },
        { name: "Adjustments", current: hist.current.totalAdjustments / 100, previous: hist.previous.totalAdjustments / 100 },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={currentOrg.name}
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
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Expenses
                </CardDescription>
                <CardTitle className="text-2xl">{money(totals?.totalExpense)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{totals?.expenseCount ?? 0} recorded</p>
                  {hist ? <Delta value={hist.deltas.totalExpense} /> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <HandCoins className="h-3.5 w-3.5" /> Payments
                </CardDescription>
                <CardTitle className="text-2xl">{money(totals?.totalPayments)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{totals?.paymentCount ?? 0} collected</p>
                  {hist ? <Delta value={hist.deltas.totalPayments} invert /> : null}
                </div>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{totals?.adjustmentCount ?? 0} applied</p>
                  {hist ? <Delta value={hist.deltas.totalAdjustments} /> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5" /> Meals
                </CardDescription>
                <CardTitle className="text-2xl">{mealData?.totals.consumed ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  of {mealData?.totals.entries ?? 0} entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Members
                </CardDescription>
                <CardTitle className="text-2xl">{members?.items?.length ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {members?.items?.filter((m) => m.status === "ACTIVE").length ?? 0} active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Net Outstanding Banner */}
          <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-muted/50 to-muted/30 px-5 py-3">
            <span className="text-sm text-muted-foreground">Net outstanding for {periodLabel(periodKey)}</span>
            <span className={`text-lg font-bold tabular-nums ${(netOutstanding ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {money(netOutstanding)}
            </span>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Expense by Category Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-4 w-4" /> Expense by Category
                </CardTitle>
                <CardDescription>Breakdown of spending this period</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryPieData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No expense data yet.</p>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {categoryPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      {categoryPieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="truncate text-muted-foreground">{entry.name}</span>
                          <span className="ml-auto font-medium tabular-nums">{entry.percent.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Period Comparison Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" /> Period Comparison
                </CardTitle>
                <CardDescription>
                  {periodLabel(hist?.current.periodKey ?? periodKey)} vs {periodLabel(hist?.previous.periodKey ?? "")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonBarData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No comparison data.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonBarData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="current" name="Current" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="previous" name="Previous" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Members + Payments */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Member Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Member Balances</CardTitle>
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
                            className={`flex items-center gap-1 text-sm font-medium tabular-nums ${
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

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Payment Summary
                </CardTitle>
                <CardDescription>Breakdown by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                {!paymentData ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No payment data.</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: "Contributions", value: paymentData.totals.contribution },
                      { label: "Advance", value: paymentData.totals.advance },
                      { label: "Settlement", value: paymentData.totals.settlement },
                      { label: "Refund", value: paymentData.totals.refund },
                    ].filter((r) => r.value > 0).map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-medium tabular-nums">{money(row.value)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-sm font-bold tabular-nums">{money(paymentData.totals.total)}</span>
                    </div>

                    {paymentData.byMember.length > 0 && (
                      <>
                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground uppercase">By member</p>
                        {paymentData.byMember.slice(0, 5).map((m) => (
                          <div key={m.organizationMemberId} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{m.name}</span>
                            <span className="tabular-nums">{money(m.total)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Meal Analytics */}
          {mealData && mealData.byMealType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="h-4 w-4" /> Meal Analytics
                </CardTitle>
                <CardDescription>Consumption by meal type this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {mealData.byMealType.map((mt) => (
                    <div key={mt.mealTypeId} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{mt.name}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{mt.consumed} consumed</span>
                        <span>{mt.cancelled} cancelled</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${mt.count > 0 ? (mt.consumed / mt.count) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Expenses */}
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
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
        </>
      ) : null}
    </div>
  );
}
