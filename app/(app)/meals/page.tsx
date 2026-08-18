"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Check, Minus, Plane, X, Settings as SettingsIcon, ChevronDown, Utensils, LayoutGrid, Table } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { MealEntry, MealType, Member } from "@/lib/frontend/api-types";
import { formatDate, currentPeriodKey, periodLabel } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Button } from "@/components/ui/button";
import { DatePicker, MonthPicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/frontend/api-client";

interface MealDayStatus {
  _id: string;
  date: string;
  mealTypeId: { _id: string; name: string } | string;
  status: string;
  reason?: string;
}

function memberName(m: { _id: string; userId?: { name?: string } | string }): string {
  return typeof m.userId === "object" && m.userId?.name ? m.userId.name : m._id.slice(-6);
}

function memberInitial(m: { _id: string; userId?: { name?: string } | string }): string {
  return memberName(m).charAt(0).toUpperCase();
}

const MEAL_COLORS: Record<string, string> = {
  CONSUMED: "bg-emerald-500",
  NOT_CONSUMED: "bg-muted-foreground/40",
  AWAY: "bg-amber-500",
  CANCELLED: "bg-rose-500",
  ADJUSTED: "bg-cyan-500",
};

const MEAL_DOT_BG: Record<string, string> = {
  CONSUMED: "bg-emerald-500/20 border-emerald-500/40",
  NOT_CONSUMED: "bg-muted/60 border-muted-foreground/30",
  AWAY: "bg-amber-500/20 border-amber-500/40",
  CANCELLED: "bg-rose-500/20 border-rose-500/40",
  ADJUSTED: "bg-cyan-500/20 border-cyan-500/40",
};

const STATUS_CYCLE: Record<string, string> = {
  "": "CONSUMED",
  CONSUMED: "NOT_CONSUMED",
  NOT_CONSUMED: "AWAY",
  AWAY: "CONSUMED",
};

const STATUS_LABELS: Record<string, string> = {
  CONSUMED: "Eaten",
  NOT_CONSUMED: "Absent",
  AWAY: "Away",
  ADJUSTED: "Adjusted",
};

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MealsPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canCreate = can("meals.create");
  const canManage = can("meals.manage");
  const canViewMembers = can("members.view");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"card" | "sheet">("card");
  const [monthKey, setMonthKey] = useState(currentPeriodKey());

  const { data: mealTypes, loading: loadingTypes } = useApiData<MealType[]>(
    async () => api.get<MealType[]>(`/api/organizations/${orgId}/meal-types`),
    [orgId]
  );
  const activeMealTypes = (mealTypes ?? []).filter((mt) => mt.status === "ACTIVE");

  const { data: members, loading: loadingMembers } = useApiData<ApiListData<Member>>(
    async () =>
      canViewMembers
        ? api.get<ApiListData<Member>>(`/api/organizations/${orgId}/members?limit=100`)
        : { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    [orgId, canViewMembers]
  );

  const { data: entryData, loading: loadingEntries, reload } = useApiData<ApiListData<MealEntry>>(
    async () => api.get<ApiListData<MealEntry>>(`/api/organizations/${orgId}/meal-entries${toQuery({ date })}`),
    [orgId, date]
  );
  const entries = entryData?.items ?? [];

  const { data: dayStatuses } = useApiData<MealDayStatus[]>(
    async () => api.get<MealDayStatus[]>(`/api/organizations/${orgId}/meal-day-status${toQuery({ date })}`),
    [orgId, date]
  );

  const [monthStart, monthEnd] = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const start = `${monthKey}-01`;
    const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    return [start, end];
  }, [monthKey]);

  const { data: monthEntries, reload: reloadMonth } = useApiData<ApiListData<MealEntry>>(
    async () => view === "sheet" ? api.get<ApiListData<MealEntry>>(`/api/organizations/${orgId}/meal-entries${toQuery({ from: monthStart, to: monthEnd })}`) : { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } },
    [orgId, monthStart, monthEnd, view]
  );

  const { data: monthDayStatuses } = useApiData<MealDayStatus[]>(
    async () => view === "sheet" ? api.get<MealDayStatus[]>(`/api/organizations/${orgId}/meal-day-status${toQuery({ from: monthStart, to: monthEnd })}`) : [],
    [orgId, monthStart, monthEnd, view]
  );

  const activeMembers = (members?.items ?? []).filter((m) => m.status === "ACTIVE");
  const roster = canViewMembers
    ? activeMembers
    : Array.from(
        new Map(
          entries
            .map((e) => (typeof e.organizationMemberId === "object" ? e.organizationMemberId : null))
            .filter((m): m is NonNullable<typeof m> => Boolean(m))
            .map((m) => [m._id, m])
        ).values()
      );

  const eKey = (mid: string, mtid: string) => `${mid}:${mtid}`;
  const entriesByKey = new Map(entries.map((e) => [
    eKey(
      typeof e.organizationMemberId === "object" ? e.organizationMemberId._id : String(e.organizationMemberId),
      typeof e.mealTypeId === "object" ? e.mealTypeId._id : String(e.mealTypeId)
    ),
    e,
  ]));

  const dayStatusByMT = new Map(
    (dayStatuses ?? []).map((s) => [
      typeof s.mealTypeId === "object" ? s.mealTypeId._id : String(s.mealTypeId),
      s,
    ])
  );

  const monthDays = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    return getMonthDays(y, m - 1);
  }, [monthKey]);

  const toDayKey = (d: string) => d.slice(0, 10);

  const monthEntriesByKey = useMemo(() => {
    const map = new Map<string, MealEntry>();
    for (const e of (monthEntries?.items ?? [])) {
      const mid = typeof e.organizationMemberId === "object" ? e.organizationMemberId._id : String(e.organizationMemberId);
      const mtid = typeof e.mealTypeId === "object" ? e.mealTypeId._id : String(e.mealTypeId);
      map.set(`${toDayKey(String(e.date))}:${mid}:${mtid}`, e);
    }
    return map;
  }, [monthEntries]);

  const monthStatusMap = useMemo(() => {
    const map = new Map<string, MealDayStatus>();
    for (const s of (monthDayStatuses ?? [])) {
      const mtid = typeof s.mealTypeId === "object" ? s.mealTypeId._id : String(s.mealTypeId);
      map.set(`${toDayKey(String(s.date))}:${mtid}`, s);
    }
    return map;
  }, [monthDayStatuses]);

  const setEntry = async (mid: string, mtid: string, status: string) => {
    if (!canCreate) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries`, { organizationMemberId: mid, date, mealTypeId: mtid, status });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update meal entry");
    }
  };

  const markAll = async (mtid: string, status: "CONSUMED" | "NOT_CONSUMED") => {
    if (!canCreate || roster.length === 0) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries/bulk`, { date, mealTypeId: mtid, organizationMemberIds: roster.map((m) => m._id), status });
      toast.success(status === "CONSUMED" ? "Marked everyone as eaten" : "Marked everyone as absent");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update entries");
    }
  };

  const setDayStatus = async (mtid: string, status: string) => {
    if (!canManage) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-day-status`, { date, mealTypeId: mtid, status });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update day status");
    }
  };

  const clearDayStatus = async (mtid: string) => {
    if (!canManage) return;
    try {
      await api.delete(`/api/organizations/${orgId}/meal-day-status/clear`, { date, mealTypeId: mtid });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to clear day status");
    }
  };

  const setMonthEntry = useCallback(async (targetDate: string, mid: string, mtid: string, status: string) => {
    if (!canCreate) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries`, { organizationMemberId: mid, date: targetDate, mealTypeId: mtid, status });
      reloadMonth();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update entry");
    }
  }, [orgId, canCreate, reloadMonth]);

  const bulkMarkAllForDay = async (targetDate: string, mtid: string, status: "CONSUMED" | "NOT_CONSUMED") => {
    if (!canCreate || roster.length === 0) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries/bulk`, { date: targetDate, mealTypeId: mtid, organizationMemberIds: roster.map((m) => m._id), status });
      toast.success(status === "CONSUMED" ? "Marked all as eaten" : "Marked all as absent");
      reloadMonth();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update entries");
    }
  };

  const toggleMonthEntry = useCallback((targetDate: string, mid: string, mtid: string, currentStatus: string) => {
    const next = STATUS_CYCLE[currentStatus] ?? "CONSUMED";
    void setMonthEntry(targetDate, mid, mtid, next);
  }, [setMonthEntry]);

  const loading = loadingTypes || loadingMembers || loadingEntries;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meals"
        description={view === "card" ? `Daily tracking · ${formatDate(date)}` : `${periodLabel(monthKey)} overview`}
      >
        <div className="flex items-center gap-2">
          <Button variant={view === "card" ? "default" : "outline"} size="sm" onClick={() => setView("card")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "sheet" ? "default" : "outline"} size="sm" onClick={() => setView("sheet")}>
            <Table className="h-4 w-4" />
          </Button>
        </div>
        {view === "card" ? (
          <DatePicker className="w-44" value={date} onChange={(val) => val && setDate(val)} />
        ) : (
          <MonthPicker className="w-44" value={monthKey} max={currentPeriodKey()} onChange={(val) => val && setMonthKey(val)} />
        )}
        {canManage ? (
          <Button variant="outline" nativeButton={false} render={<Link href="/meals/config" />}>
            <SettingsIcon className="mr-1.5 h-4 w-4" /> Config
          </Button>
        ) : null}
      </PageHeader>

      {loading && !entryData ? <LoadingState /> : null}
      {!loadingTypes && activeMealTypes.length === 0 ? (
        <ErrorState message="No meal types configured yet." onRetry={reload} />
      ) : null}

      {/* ==================== CARD VIEW ==================== */}
      {view === "card" &&
        activeMealTypes.map((mealType) => {
          const ds = dayStatusByMT.get(mealType._id);
          const eaten = roster.filter((m) => entriesByKey.get(eKey(m._id, mealType._id))?.status === "CONSUMED").length;

          return (
            <Card key={mealType._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Utensils className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{mealType.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{eaten}/{roster.length} eaten</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select value={ds?.status ?? ""} onValueChange={(v) => v && setDayStatus(mealType._id, v)} items={[{ value: "ACTIVE", label: "Active" }, { value: "CANCELLED", label: "Cancelled" }, { value: "UNAVAILABLE", label: "Unavailable" }]}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Day status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                    {ds ? (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { void clearDayStatus(mealType._id); }} disabled={!canManage}>Clear</Button>
                    ) : null}
                    {canCreate ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8" />}>
                          Actions <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { void markAll(mealType._id, "CONSUMED"); }}>
                            <Check className="mr-2 h-4 w-4 text-emerald-600" /> Mark all eaten
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => { void markAll(mealType._id, "NOT_CONSUMED"); }}>
                            <Minus className="mr-2 h-4 w-4 text-muted-foreground" /> Mark all absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ds ? (
                  <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    {ds.status === "CANCELLED" ? "This meal was cancelled for the day." : "This meal was unavailable today."}
                    {ds.reason ? ` Reason: ${ds.reason}` : ""}
                  </p>
                ) : null}
                {roster.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No members to track.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {roster.map((member) => {
                      const entry = entriesByKey.get(eKey(member._id, mealType._id));
                      const status = entry?.status ?? "";
                      const marker = status ? MEAL_DOT_BG[status] : null;
                      return (
                        <button
                          key={member._id}
                          disabled={!canCreate || ds?.status === "CANCELLED"}
                          onClick={() => {
                            if (status) { void setEntry(member._id, mealType._id, "NOT_CONSUMED"); }
                            else { void setEntry(member._id, mealType._id, "CONSUMED"); }
                          }}
                          className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                            marker
                              ? `${marker} ${status === "CONSUMED" ? "text-emerald-600" : status === "NOT_CONSUMED" ? "text-muted-foreground" : status === "AWAY" ? "text-amber-600" : "text-rose-600"}`
                              : "border-dashed border-muted-foreground/30 bg-background hover:border-primary/50 hover:bg-primary/5"
                          } ${canCreate && ds?.status !== "CANCELLED" ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"}`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${marker ? "bg-white/20 dark:bg-black/20" : "bg-muted"}`}>
                            {marker ? (
                              status === "CONSUMED" ? <Check className="h-4 w-4" /> :
                              status === "NOT_CONSUMED" ? <Minus className="h-4 w-4" /> :
                              status === "AWAY" ? <Plane className="h-4 w-4" /> :
                              <X className="h-4 w-4" />
                            ) : memberInitial(member)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{memberName(member)}</p>
                            <p className="truncate text-[10px] opacity-70">{STATUS_LABELS[status] ?? "Tap to mark"}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

      {/* ==================== SHEET VIEW — Excel-like grid ==================== */}
      {view === "sheet" && activeMealTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Meal Tracker — click cells to toggle</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {activeMealTypes.map((mt, i) => (
                  <span key={mt._id} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-amber-500" : MEAL_COLORS[activeMealTypes[i % activeMealTypes.length]?._id] ?? "bg-gray-400"}`} />
                    {mt.name}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Eaten
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                  Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Away
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-popover z-20 min-w-35 border-r">Member</TableHead>
                    {monthDays.map((day) => {
                      const d = new Date(day + "T00:00:00");
                      const isToday = day === new Date().toISOString().slice(0, 10);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <TableHead key={day} className={`text-center min-w-13 px-1 border-r last:border-r-0 ${isToday ? "bg-primary/10" : ""} ${isWeekend ? "bg-muted/30" : ""}`}>
                          <div className="flex flex-col items-center leading-none">
                            <span className={`text-[10px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{WEEKDAYS[d.getDay()]}</span>
                            <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</span>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                  {canCreate && (
                    <TableRow>
                      <TableHead className="sticky left-0 bg-popover z-20 border-r">
                        <span className="text-[10px] text-muted-foreground font-normal">Bulk actions</span>
                      </TableHead>
                      {monthDays.map((day) => (
                        <TableHead key={day} className="px-1 py-1 border-r last:border-r-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-6 w-full text-muted-foreground" />}>
                              <ChevronDown className="h-3 w-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-52">
                              {activeMealTypes.map((mt) => (
                                <DropdownMenuItem key={mt._id} onSelect={() => { void bulkMarkAllForDay(day, mt._id, "CONSUMED"); }}>
                                  <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" /> {mt.name} — all eaten
                                </DropdownMenuItem>
                              ))}
                              {activeMealTypes.map((mt) => (
                                <DropdownMenuItem key={`absent-${mt._id}`} onSelect={() => { void bulkMarkAllForDay(day, mt._id, "NOT_CONSUMED"); }}>
                                  <Minus className="mr-2 h-3.5 w-3.5" /> {mt.name} — all absent
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableHead>
                      ))}
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {roster.map((member) => (
                    <TableRow key={member._id}>
                      <TableCell className="sticky left-0 bg-popover z-10 border-r font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {memberInitial(member)}
                          </div>
                          <span className="truncate">{memberName(member)}</span>
                        </div>
                      </TableCell>
                      {monthDays.map((day) => {
                        const isToday = day === new Date().toISOString().slice(0, 10);
                        const isWeekend = new Date(day + "T00:00:00").getDay() === 0 || new Date(day + "T00:00:00").getDay() === 6;
                        return (
                          <TableCell
                            key={day}
                            className={`px-1 py-1 border-r last:border-r-0 text-center ${isToday ? "bg-primary/5" : ""} ${isWeekend ? "bg-muted/20" : ""}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {activeMealTypes.map((mt, i) => {
                                const entry = monthEntriesByKey.get(`${day}:${member._id}:${mt._id}`);
                                const status = entry?.status ?? "";
                                const isActive = status === "CONSUMED" || status === "ADJUSTED";
                                const isAway = status === "AWAY";
                                const isAbsent = status === "NOT_CONSUMED";
                                const ds = monthStatusMap.get(`${day}:${mt._id}`);
                                const isOff = ds?.status === "CANCELLED" || ds?.status === "UNAVAILABLE";

                                const dotColorClass = isActive
                                  ? (i === 0 ? "bg-emerald-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-amber-500" : "bg-emerald-500")
                                  : isAway ? "bg-amber-500"
                                  : isAbsent ? "bg-muted-foreground/40"
                                  : "bg-transparent border border-dashed border-muted-foreground/25";

                                return (
                                  <button
                                    key={mt._id}
                                    type="button"
                                    disabled={!canCreate || isOff}
                                    title={`${mt.name}: ${STATUS_LABELS[status] ?? "Not set"} — click to toggle`}
                                    onClick={() => toggleMonthEntry(day, member._id, mt._id, status)}
                                    className={`h-5 w-5 rounded-sm transition-all ${canCreate && !isOff ? "cursor-pointer hover:scale-125 active:scale-90 hover:ring-1 hover:ring-primary/40" : "cursor-not-allowed opacity-40"} ${dotColorClass} ${isActive ? "shadow-sm" : ""}`}
                                  >
                                    {isActive && <Check className="h-3.5 w-3.5 text-white m-auto drop-shadow" />}
                                    {isAway && <Plane className="h-3 w-3 text-white m-auto drop-shadow" />}
                                    {isAbsent && <Minus className="h-3 w-3 text-muted-foreground/70 m-auto" />}
                                  </button>
                                );
                              })}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {/* Summary row */}
                  <TableRow className="border-t-2">
                    <TableCell className="sticky left-0 bg-popover z-10 border-r text-xs font-semibold text-muted-foreground">
                      Total eaten
                    </TableCell>
                    {monthDays.map((day) => {
                      const isToday = day === new Date().toISOString().slice(0, 10);
                      const isWeekend = new Date(day + "T00:00:00").getDay() === 0 || new Date(day + "T00:00:00").getDay() === 6;
                      return (
                        <TableCell
                          key={day}
                          className={`px-1 py-1 border-r last:border-r-0 text-center ${isToday ? "bg-primary/5" : ""} ${isWeekend ? "bg-muted/20" : ""}`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            {activeMealTypes.map((mt, i) => {
                              let count = 0;
                              for (const m of roster) {
                                const entry = monthEntriesByKey.get(`${day}:${m._id}:${mt._id}`);
                                if (entry?.status === "CONSUMED" || entry?.status === "ADJUSTED") count++;
                              }
                              return (
                                <span key={mt._id} className={`text-sm font-semibold ${i === 0 ? "text-emerald-600" : i === 1 ? "text-blue-600" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </TableComponent>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
