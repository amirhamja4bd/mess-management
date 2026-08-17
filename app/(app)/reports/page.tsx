"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery } from "@/lib/frontend/api-client";
import type {
  ExpenseCategoryTotalsReport,
  MealAnalyticsReport,
  PaymentSummaryReport,
  MemberTotalsReport,
  HistoricalComparisonReport,
} from "@/lib/frontend/api-types";
import { money, periodLabel, currentPeriodKey } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthPicker } from "@/components/ui/date-picker";

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

export default function ReportsPage() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.organizationId;
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const query = toQuery({ periodKey });

  const { data: categoryData, error: categoryError, loading: categoryLoading, reload: reloadCategories } =
    useApiData<ExpenseCategoryTotalsReport>(
      async () => api.get(`/api/organizations/${orgId}/reports/expense-category-totals${query}`),
      [orgId, periodKey]
    );

  const { data: mealData, loading: mealLoading, error: mealError, reload: reloadMeal } =
    useApiData<MealAnalyticsReport>(
      async () => api.get(`/api/organizations/${orgId}/reports/meal-analytics${query}`),
      [orgId, periodKey]
    );

  const { data: paymentData, loading: paymentLoading, error: paymentError, reload: reloadPayment } =
    useApiData<PaymentSummaryReport>(
      async () => api.get(`/api/organizations/${orgId}/reports/payment-summary${query}`),
      [orgId, periodKey]
    );

  const { data: memberData, loading: memberLoading, error: memberError, reload: reloadMember } =
    useApiData<MemberTotalsReport>(
      async () => api.get(`/api/organizations/${orgId}/reports/member-totals${query}`),
      [orgId, periodKey]
    );

  const { data: comparison, loading: comparisonLoading, error: comparisonError, reload: reloadComparison } =
    useApiData<HistoricalComparisonReport>(
      async () => api.get(`/api/organizations/${orgId}/reports/historical-comparison${query}`),
      [orgId, periodKey]
    );

  const pieData = (categoryData?.breakdown ?? [])
    .filter((item) => item.total > 0)
    .map((item) => ({ name: item.name, value: item.total / 100 }));

  const mealTypeData = (mealData?.byMealType ?? []).map((item) => ({
    name: item.name,
    Consumed: item.consumed,
    Missed: item.count - item.consumed - item.cancelled,
  }));

  const prevLabel = comparison ? periodLabel(comparison.previous.periodKey) : "previous";
  const currLabel = comparison ? periodLabel(comparison.current.periodKey) : "current";

  const comparisonChartData = comparison
    ? [
        {
          name: "Expense",
          [prevLabel]: comparison.previous.totalExpense / 100,
          [currLabel]: comparison.current.totalExpense / 100,
        },
        {
          name: "Payments",
          [prevLabel]: comparison.previous.totalPayments / 100,
          [currLabel]: comparison.current.totalPayments / 100,
        },
        {
          name: "Meal units",
          [prevLabel]: comparison.previous.mealUnits,
          [currLabel]: comparison.current.mealUnits,
        },
      ]
    : [];

  const reloadAll = () => {
    reloadCategories();
    reloadMeal();
    reloadPayment();
    reloadMember();
    reloadComparison();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Insights for ${periodLabel(periodKey)}`}
      >
        <MonthPicker
          className="w-44"
          value={periodKey}
          onChange={(val) => setPeriodKey(val || currentPeriodKey())}
        />
      </PageHeader>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense by category</CardTitle>
                <CardDescription>Where the money went this period</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? <LoadingState /> : null}
                {categoryError ? <ErrorState message={categoryError.message} onRetry={reloadAll} /> : null}
                {pieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(entry: { name?: string }) => entry.name ?? ""}
                          labelLine={false}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: unknown) => money(Math.round(Number(value) * 100))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : !categoryLoading ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No expenses this period.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Period comparison</CardTitle>
                <CardDescription>
                  {comparison ? `${periodLabel(comparison.current.periodKey)} vs ${periodLabel(comparison.previous.periodKey)}` : "Loading…"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonLoading ? <LoadingState /> : null}
                {comparisonError ? <ErrorState message={comparisonError.message} onRetry={reloadAll} /> : null}
                {comparisonChartData.length > 0 ? (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                          <Tooltip />
                          <Legend />
                           <Bar dataKey={prevLabel} fill="#94a3b8" />
                           <Bar dataKey={currLabel} fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Money shown in taka · units shown raw
                    </p>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {memberLoading || comparisonLoading ? <LoadingState /> : null}
          {categoryData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{money(categoryData.grandTotal)}</p>
                </CardContent>
              </Card>
              {comparison?.deltas ? (
                <DeltaCard
                  label="vs previous (expense)"
                  value={comparison.deltas.totalExpense}
                />
              ) : null}
              {comparison?.deltas ? (
                <DeltaCard label="vs previous (payments)" value={comparison.deltas.totalPayments} />
              ) : null}
              {comparison?.deltas ? (
                <DeltaCard label="vs previous (meals)" value={comparison.deltas.mealUnits} raw />
              ) : null}
            </div>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(categoryData?.breakdown ?? []).map((item) => (
                      <TableRow key={item.categoryId}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(item.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.percent}%</TableCell>
                      </TableRow>
                    ))}
                    {(categoryData?.breakdown ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No expenses this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
          {mealError ? <ErrorState message={mealError.message} onRetry={reloadAll} /> : null}
          {mealData ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Meal entries" value={String(mealData.totals.entries)} />
              <StatCard label="Consumed" value={String(mealData.totals.consumed)} />
              <StatCard label="Missed" value={String(mealData.totals.notConsumed)} />
            </div>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>By meal type</CardTitle>
            </CardHeader>
            <CardContent>
              {mealLoading ? <LoadingState /> : null}
              {mealTypeData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mealTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Consumed" stackId="a" fill="#22c55e" />
                      <Bar dataKey="Missed" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              {mealData && mealData.byMember.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mealData.byMember.map((member) => (
                        <TableRow key={member.organizationMemberId}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{member.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {paymentError ? <ErrorState message={paymentError.message} onRetry={reloadAll} /> : null}
          {paymentData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Total" value={money(paymentData.totals.total)} />
              <StatCard label="Contributions" value={money(paymentData.totals.contribution)} />
              <StatCard label="Advances" value={money(paymentData.totals.advance)} />
              <StatCard label="Settlement" value={money(paymentData.totals.settlement)} />
              <StatCard label="Refunds" value={money(paymentData.totals.refund)} />
            </div>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>By member</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentLoading ? <LoadingState /> : null}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paymentData?.byMember ?? []).map((member) => (
                      <TableRow key={member.organizationMemberId}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{member.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.total)}</TableCell>
                      </TableRow>
                    ))}
                    {(paymentData?.byMember ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No payments this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {memberError ? <ErrorState message={memberError.message} onRetry={reloadAll} /> : null}
          <Card>
            <CardHeader>
              <CardTitle>Per-member totals</CardTitle>
              <CardDescription>Charged vs paid, live from expenses and payments</CardDescription>
            </CardHeader>
            <CardContent>
              {memberLoading ? <LoadingState /> : null}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Food</TableHead>
                      <TableHead className="text-right">Common</TableHead>
                      <TableHead className="text-right">Individual</TableHead>
                      <TableHead className="text-right">Charged</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(memberData?.members ?? []).map((member) => (
                      <TableRow key={member.organizationMemberId}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.foodShare)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.commonShare)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.individualShare)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.totalCharged)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(member.totalPaid)}</TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            member.balance > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {money(member.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(memberData?.members ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                          No members this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function DeltaCard({ label, value, raw }: { label: string; value: number; raw?: boolean }) {
  const positive = value > 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-2xl font-semibold tabular-nums ${
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {positive ? "▲" : "▼"} {raw ? Math.abs(value) : money(Math.abs(value))}
        </p>
      </CardContent>
    </Card>
  );
}
