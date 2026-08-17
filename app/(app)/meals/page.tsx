"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plane, X, Settings as SettingsIcon, ChevronDown, Utensils } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, toQuery, type ApiListData } from "@/lib/frontend/api-client";
import type { MealEntry, MealType, Member } from "@/lib/frontend/api-types";
import { formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { ApiError } from "@/lib/frontend/api-client";

interface MealDayStatus {
  _id: string;
  date: string;
  mealTypeId: { _id: string; name: string } | string;
  status: string;
  reason?: string;
}

function memberName(member: { _id: string; userId?: { name?: string } | string }): string {
  return typeof member.userId === "object" && member.userId?.name
    ? member.userId.name
    : member._id.slice(-6);
}

function memberInitial(member: { _id: string; userId?: { name?: string } | string }): string {
  const name = memberName(member);
  return name.charAt(0).toUpperCase();
}

const ENTRY_MARKERS: Record<string, { label: string; icon: typeof Check; className: string; bg: string }> = {
  CONSUMED: { label: "Eaten", icon: Check, className: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30" },
  NOT_CONSUMED: { label: "Absent", icon: Minus, className: "text-muted-foreground", bg: "bg-muted/50 border-muted" },
  AWAY: { label: "Away", icon: Plane, className: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30" },
  CANCELLED: { label: "Cancelled", icon: X, className: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30" },
  ADJUSTED: { label: "Adjusted", icon: Check, className: "text-cyan-600", bg: "bg-cyan-500/15 border-cyan-500/30" },
};

export default function MealsPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canCreate = can("meals.create");
  const canManage = can("meals.manage");
  const canViewMembers = can("members.view");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

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
    async () =>
      api.get<ApiListData<MealEntry>>(
        `/api/organizations/${orgId}/meal-entries${toQuery({ date })}`
      ),
    [orgId, date]
  );
  const entries = entryData?.items ?? [];

  const { data: dayStatuses } = useApiData<MealDayStatus[]>(
    async () =>
      api.get<MealDayStatus[]>(`/api/organizations/${orgId}/meal-day-status${toQuery({ date })}`),
    [orgId, date]
  );

  const activeMembers = (members?.items ?? []).filter((m) => m.status === "ACTIVE");
  const roster = canViewMembers
    ? activeMembers
    : Array.from(
        new Map(
          entries
            .map((entry) =>
              typeof entry.organizationMemberId === "object" ? entry.organizationMemberId : null
            )
            .filter((member): member is NonNullable<typeof member> => Boolean(member))
            .map((member) => [member._id, member])
        ).values()
      );

  const entryKey = (memberId: string, mealTypeId: string) => `${memberId}:${mealTypeId}`;
  const entriesByKey = new Map(entries.map((entry) => [
    entryKey(
      typeof entry.organizationMemberId === "object" ? entry.organizationMemberId._id : String(entry.organizationMemberId),
      typeof entry.mealTypeId === "object" ? entry.mealTypeId._id : String(entry.mealTypeId)
    ),
    entry,
  ]));

  const dayStatusByMealType = new Map(
    (dayStatuses ?? []).map((status) => [
      typeof status.mealTypeId === "object" ? status.mealTypeId._id : String(status.mealTypeId),
      status,
    ])
  );

  const setEntry = async (memberId: string, mealTypeId: string, status: string) => {
    if (!canCreate) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries`, {
        organizationMemberId: memberId,
        date,
        mealTypeId,
        status,
      });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update meal entry");
    }
  };

  const markAll = async (mealTypeId: string, status: "CONSUMED" | "NOT_CONSUMED") => {
    if (!canCreate || roster.length === 0) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-entries/bulk`, {
        date,
        mealTypeId,
        organizationMemberIds: roster.map((m) => m._id),
        status,
      });
      toast.success(status === "CONSUMED" ? "Marked everyone as eaten" : "Marked everyone as absent");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update entries");
    }
  };

  const setDayStatus = async (mealTypeId: string, status: string) => {
    if (!canManage) return;
    try {
      await api.post(`/api/organizations/${orgId}/meal-day-status`, { date, mealTypeId, status });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update day status");
    }
  };

  const clearDayStatus = async (mealTypeId: string) => {
    if (!canManage) return;
    try {
      await api.delete(`/api/organizations/${orgId}/meal-day-status/clear`, { date, mealTypeId });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to clear day status");
    }
  };

  const loading = loadingTypes || loadingMembers || loadingEntries;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meals"
        description={`Daily meal tracking · ${formatDate(date)}`}
      >
        <DatePicker
          className="w-44"
          value={date}
          onChange={(val) => val && setDate(val)}
        />
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

      {activeMealTypes.map((mealType) => {
        const dayStatus = dayStatusByMealType.get(mealType._id);
        const consumedCount = roster.filter((m) => {
          const entry = entriesByKey.get(entryKey(m._id, mealType._id));
          return entry?.status === "CONSUMED";
        }).length;

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
                    <p className="text-sm text-muted-foreground">
                      {consumedCount}/{roster.length} eaten
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select value={dayStatus?.status ?? ""} onValueChange={(v) => v && setDayStatus(mealType._id, v)} items={[{ value: "ACTIVE", label: "Active" }, { value: "CANCELLED", label: "Cancelled" }, { value: "UNAVAILABLE", label: "Unavailable" }]}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="Day status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  {dayStatus ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => void clearDayStatus(mealType._id)}
                      disabled={!canManage}
                    >
                      Clear
                    </Button>
                  ) : null}
                  {canCreate ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8" />}>
                        Actions <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void markAll(mealType._id, "CONSUMED")}>
                          <Check className="mr-2 h-4 w-4 text-emerald-600" /> Mark all eaten
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void markAll(mealType._id, "NOT_CONSUMED")}>
                          <Minus className="mr-2 h-4 w-4 text-muted-foreground" /> Mark all absent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dayStatus ? (
                <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  {dayStatus.status === "CANCELLED" ? "This meal was cancelled for the day." : "This meal was unavailable today."}
                  {dayStatus.reason ? ` Reason: ${dayStatus.reason}` : ""}
                </p>
              ) : null}
              {roster.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No members to track.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {roster.map((member) => {
                    const entry = entriesByKey.get(entryKey(member._id, mealType._id));
                    const marker = entry ? ENTRY_MARKERS[entry.status] : null;
                    return (
                      <button
                        key={member._id}
                        disabled={!canCreate || (dayStatus?.status === "CANCELLED")}
                        onClick={() => {
                          if (marker) {
                            void setEntry(member._id, mealType._id, "NOT_CONSUMED");
                          } else {
                            void setEntry(member._id, mealType._id, "CONSUMED");
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                          marker
                            ? `${marker.bg} ${marker.className}`
                            : "border-dashed border-muted-foreground/30 bg-background hover:border-primary/50 hover:bg-primary/5"
                        } ${canCreate && dayStatus?.status !== "CANCELLED" ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"}`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          marker ? "bg-white/20 dark:bg-black/20" : "bg-muted"
                        }`}>
                          {marker ? <marker.icon className="h-4 w-4" /> : memberInitial(member)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{memberName(member)}</p>
                          <p className="truncate text-[10px] opacity-70">{marker?.label ?? "Tap to mark"}</p>
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
    </div>
  );
}
