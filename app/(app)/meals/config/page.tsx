"use client";

import { useState } from "react";
import { Plus, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, ApiError } from "@/lib/frontend/api-client";
import type { MealType } from "@/lib/frontend/api-types";
import { formatDate, todayInput } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ConfigItem {
  _id: string;
  mealTypeId: { _id: string; name: string } | string;
  weight: number;
  effectiveFrom: string;
  isCurrent?: boolean;
}

export default function MealConfigPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canManage = can("meals.manage");

  const { data: mealTypes, reload: reloadTypes } = useApiData<MealType[]>(
    async () => api.get<MealType[]>(`/api/organizations/${orgId}/meal-types`),
    [orgId]
  );

  const { data: configs, loading, reload: reloadConfig } = useApiData<ConfigItem[]>(
    async () => api.get<ConfigItem[]>(`/api/organizations/${orgId}/meal-config`),
    [orgId]
  );

  const { data: history } = useApiData<ConfigItem[]>(
    async () => api.get<ConfigItem[]>(`/api/organizations/${orgId}/meal-config/history`),
    [orgId]
  );

  const activeTypes = (mealTypes ?? []).filter((mt) => mt.status === "ACTIVE");

  const weightById = new Map((configs ?? []).map((c) => [
    typeof c.mealTypeId === "object" ? c.mealTypeId._id : String(c.mealTypeId),
    c.weight,
  ]));

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [effectiveFrom, setEffectiveFrom] = useState(todayInput());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeBusy, setNewTypeBusy] = useState(false);
  const [archiving, setArchiving] = useState<MealType | null>(null);

  const totalWeights = activeTypes.reduce(
    (sum, type) => sum + (weights[type._id] ?? weightById.get(type._id) ?? 0),
    0
  );

  const saveWeights = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/organizations/${orgId}/meal-config`, {
        effectiveFrom,
        items: activeTypes.map((type) => ({
          mealTypeId: type._id,
          weight: weights[type._id] ?? weightById.get(type._id) ?? 0,
        })),
      });
      toast.success("Meal weights updated");
      reloadConfig();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update weights");
    } finally {
      setBusy(false);
    }
  };

  const createType = async () => {
    setNewTypeBusy(true);
    setError(null);
    try {
      await api.post(`/api/organizations/${orgId}/meal-types`, {
        name: newTypeName.trim(),
        sortOrder: activeTypes.length,
      });
      toast.success("Meal type added");
      setNewTypeName("");
      reloadTypes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add meal type");
    } finally {
      setNewTypeBusy(false);
    }
  };

  const archiveType = async () => {
    if (!archiving) return;
    try {
      await api.delete(`/api/organizations/${orgId}/meal-types/${archiving._id}`);
      toast.success("Meal type archived");
      setArchiving(null);
      reloadTypes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to archive meal type");
    }
  };

  const restoreType = async (mealType: MealType) => {
    try {
      await api.post(`/api/organizations/${orgId}/meal-types/${mealType._id}/restore`);
      toast.success("Meal type restored");
      reloadTypes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to restore meal type");
    }
  };

  if (!currentOrg) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal configuration"
        description="Meal types and their weights (must total 100)"
      />

      {error ? <ErrorState message={error} /> : null}
      {loading && !configs ? <LoadingState /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meal weights</CardTitle>
            <CardDescription>
              Weights are used to compute meal units from {formatDate(new Date(effectiveFrom))}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Effective from</Label>
              <DatePicker
                value={effectiveFrom}
                onChange={setEffectiveFrom}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meal type</TableHead>
                  <TableHead className="w-32">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTypes.map((type) => (
                  <TableRow key={type._id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        className="w-24"
                        value={weights[type._id] ?? weightById.get(type._id) ?? ""}
                        onChange={(e) =>
                          setWeights((prev) => ({
                            ...prev,
                            [type._id]: Number(e.target.value) || 0,
                          }))
                        }
                        disabled={!canManage}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className={`font-semibold ${totalWeights === 100 ? "text-emerald-600" : "text-rose-600"}`}>
                {totalWeights} / 100
              </span>
            </div>
            {canManage ? (
              <Button onClick={() => void saveWeights()} disabled={busy || totalWeights !== 100} className="w-full">
                {busy ? "Saving…" : "Save weights"}
              </Button>
            ) : null}
            {!canManage ? (
              <p className="text-xs text-muted-foreground">
                You have view access to meal weights but need the meals.manage permission to change them.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal types</CardTitle>
            <CardDescription>Add or archive meal types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New meal type (e.g. Snacks)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void createType())}
                />
                <Button variant="outline" onClick={() => void createType()} disabled={newTypeBusy || !newTypeName.trim()}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(mealTypes ?? []).map((type) => (
                  <TableRow key={type._id}>
                    <TableCell className="font-medium">
                      {type.name}
                      {type.status !== "ACTIVE" ? (
                        <span className="ml-2 rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          archived
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{type.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      {type.status === "ACTIVE" && canManage ? (
                        <Button variant="ghost" size="sm" onClick={() => setArchiving(type)}>
                          <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                        </Button>
                      ) : null}
                      {type.status !== "ACTIVE" && canManage ? (
                        <Button variant="ghost" size="sm" onClick={() => void restoreType(type)}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration history</CardTitle>
          <CardDescription>All weight changes ever applied</CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No configuration history.</p>
          ) : null}
          {history && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead>Meal type</TableHead>
                  <TableHead className="w-32">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="whitespace-nowrap">{formatDate(item.effectiveFrom)}</TableCell>
                    <TableCell>
                      {typeof item.mealTypeId === "object" ? item.mealTypeId.name : "—"}
                    </TableCell>
                    <TableCell>{item.weight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive "${archiving?.name}"?`}
        description="Archived meal types stop being used for new meal tracking but history is preserved."
        confirmLabel="Archive"
        onConfirm={archiveType}
      />
    </div>
  );
}
