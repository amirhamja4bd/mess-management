"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api } from "@/lib/frontend/api-client";
import type { ExpenseCategory, PaymentMethod, Role } from "@/lib/frontend/api-types";
import { PageHeader, LoadingState, ErrorState } from "@/components/state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/frontend/api-client";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";

interface OrgDoc {
  _id: string;
  name: string;
  description?: string | null;
  settings: {
    currency: string;
    mealWeightMode: string;
    accountingPeriodStartDay: number;
    timezone: string;
    allowMealOverrides: boolean;
    smtp?: {
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
      from?: string;
    };
  };
}

export default function SettingsPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canManage = can("settings.manage");
  const canView = can("settings.view");
  const canViewExpenses = can("expenses.view");
  const canViewPayments = can("payments.view");

  const { data: org, error, loading, reload } = useApiData<OrgDoc>(
    async () => api.get(`/api/organizations/${orgId}`),
    [orgId]
  );

  const { data: categories, reload: reloadCategories } = useApiData<ExpenseCategory[]>(
    async () =>
      canViewExpenses
        ? api.get<ExpenseCategory[]>(`/api/organizations/${orgId}/expense-categories`)
        : [],
    [orgId, canViewExpenses]
  );

  const { data: methods, reload: reloadMethods } = useApiData<PaymentMethod[]>(
    async () =>
      canViewPayments
        ? api.get<PaymentMethod[]>(`/api/organizations/${orgId}/payment-methods`)
        : [],
    [orgId, canViewPayments]
  );

  const { data: roles, reload: reloadRoles } = useApiData<Role[]>(
    async () => api.get<Role[]>(`/api/organizations/${orgId}/roles`),
    [orgId]
  );

  const [categoryEditor, setCategoryEditor] = useState<ExpenseCategory | "new" | null>(null);
  const [methodEditor, setMethodEditor] = useState<PaymentMethod | "new" | null>(null);
  const [roleEditor, setRoleEditor] = useState<"new" | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);

  if (!canView) {
    return (
      <ErrorState
        message="You don't have permission to view settings."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Organization profile and reference data" />

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !org ? <LoadingState /> : null}

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="email">Email (SMTP)</TabsTrigger>
            <TabsTrigger value="categories">Expense categories</TabsTrigger>
            <TabsTrigger value="methods">Payment methods</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            {process.env.NODE_ENV !== "production" ? (
              <TabsTrigger value="developer">Developer</TabsTrigger>
            ) : null}
          </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralForm org={org ?? undefined} orgId={orgId} canManage={canManage} onSaved={reload} />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <SmtpForm key={org?._id ?? "loading"} org={org ?? undefined} orgId={orgId} canManage={canManage} onSaved={reload} />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Expense categories</CardTitle>
                <CardDescription>Used when recording expenses; food categories drive meal-based billing.</CardDescription>
              </div>
              {canManage ? (
                <Button size="sm" onClick={() => setCategoryEditor("new")}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(categories ?? []).map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.isFood ? "Food" : "Common"}</TableCell>
                      <TableCell>{category.status === "ACTIVE" ? "Active" : "Archived"}</TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setCategoryEditor(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeletingCategory(category)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                  {(categories ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        No categories yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>How members pay — bKash, Nagad, cash, bank…</CardDescription>
              </div>
              {canManage ? (
                <Button size="sm" onClick={() => setMethodEditor("new")}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(methods ?? []).map((method) => (
                    <TableRow key={method._id}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>{method.isActive ? "Active" : "Disabled"}</TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setMethodEditor(method)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeletingMethod(method)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                  {(methods ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                        No payment methods yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>Named permission sets you can assign to members.</CardDescription>
              </div>
              {canManage ? (
                <Button size="sm" onClick={() => setRoleEditor("new")}>
                  <Plus className="mr-1.5 h-4 w-4" /> Create role
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(roles ?? []).map((role) => (
                    <TableRow key={role._id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="font-mono text-xs">{role.key}</TableCell>
                      <TableCell className="capitalize">{role.kind.toLowerCase()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {role.permissions.length} perms{role.isActive ? "" : " · inactive"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(roles ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No custom roles yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {process.env.NODE_ENV !== "production" ? (
          <TabsContent value="developer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Development only. These actions are irreversible.</CardDescription>
              </CardHeader>
              <CardContent>
                <DevResetSection />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>

      {categoryEditor ? (
        <CategoryEditorDialog
          category={categoryEditor === "new" ? null : categoryEditor}
          orgId={orgId}
          onClose={() => setCategoryEditor(null)}
          onSaved={() => {
            setCategoryEditor(null);
            reloadCategories();
          }}
        />
      ) : null}

      {methodEditor ? (
        <MethodEditorDialog
          method={methodEditor === "new" ? null : methodEditor}
          orgId={orgId}
          onClose={() => setMethodEditor(null)}
          onSaved={() => {
            setMethodEditor(null);
            reloadMethods();
          }}
        />
      ) : null}

      {roleEditor ? (
        <RoleEditorDialog
          orgId={orgId}
          onClose={() => setRoleEditor(null)}
          onSaved={() => {
            setRoleEditor(null);
            reloadRoles();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Delete category?"
        description={`"${deletingCategory?.name}" will be removed. Existing expenses keep their name via the cycle snapshot.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deletingCategory) return;
          try {
            await api.delete(`/api/organizations/${orgId}/expense-categories/${deletingCategory._id}`);
            toast.success("Category deleted");
            setDeletingCategory(null);
            reloadCategories();
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to delete category");
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingMethod)}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
        title="Delete payment method?"
        description={`"${deletingMethod?.name}" will be removed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deletingMethod) return;
          try {
            await api.delete(`/api/organizations/${orgId}/payment-methods/${deletingMethod._id}`);
            toast.success("Payment method deleted");
            setDeletingMethod(null);
            reloadMethods();
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to delete payment method");
          }
        }}
      />
    </div>
  );
}

function GeneralForm({
  org,
  orgId,
  canManage,
  onSaved,
}: {
  org?: OrgDoc;
  orgId: string | undefined;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org?.name ?? "");
  const [description, setDescription] = useState(org?.description ?? "");
  const [startDay, setStartDay] = useState(org?.settings.accountingPeriodStartDay ?? 1);
  const [allowOverrides, setAllowOverrides] = useState(org?.settings.allowMealOverrides ?? true);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Organization profile and accounting preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!orgId) return;
            setBusy(true);
            try {
              await api.patch(`/api/organizations/${orgId}`, {
                name,
                description: description || null,
                settings: {
                  accountingPeriodStartDay: startDay,
                  allowMealOverrides: allowOverrides,
                },
              });
              toast.success("Settings saved");
              onSaved();
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label>Organization name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!canManage} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={!canManage}
              placeholder="Optional description"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Accounting period starts on day</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                disabled={!canManage}
              />
              <p className="text-xs text-muted-foreground">e.g. day 1 = calendar month, day 10 = 10th-to-9th.</p>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Allow meal overrides</p>
              <p className="text-xs text-muted-foreground">Let members mark meals they couldn&apos;t attend.</p>
            </div>
            <Switch checked={allowOverrides} onCheckedChange={setAllowOverrides} disabled={!canManage} />
          </label>
          {canManage ? (
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function SmtpForm({
  org,
  orgId,
  canManage,
  onSaved,
}: {
  org?: OrgDoc;
  orgId: string | undefined;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [host, setHost] = useState(org?.settings.smtp?.host ?? "");
  const [port, setPort] = useState(org?.settings.smtp?.port?.toString() ?? "587");
  const [user, setUser] = useState(org?.settings.smtp?.user ?? "");
  const [pass, setPass] = useState(org?.settings.smtp?.pass ?? "");
  const [from, setFrom] = useState(org?.settings.smtp?.from ?? "");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    try {
      await api.patch(`/api/organizations/${orgId}`, {
        settings: {
          smtp: {
            host: host || undefined,
            port: port ? parseInt(port, 10) : undefined,
            user: user || undefined,
            pass: pass || undefined,
            from: from || undefined,
          },
        },
      });
      toast.success("Email settings saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        `/api/organizations/${orgId}/settings/test-email`,
        { to: user || "test@example.com" }
      );
      setTestResult(result.message || (result.success ? "Test email sent!" : "Failed to send test email"));
    } catch (err) {
      setTestResult(err instanceof ApiError ? err.message : "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email (SMTP) Settings</CardTitle>
        <CardDescription>
          Configure email sending for invitations, password resets, and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">SMTP Required</p>
            <p className="mt-1 text-xs">
              Configure your SMTP server to send invitation emails. Without SMTP, you can still
              copy invitation links manually.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>SMTP Host *</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.gmail.com"
                required
                disabled={!canManage}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="587"
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Username / Email *</Label>
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="your-email@gmail.com"
                required
                disabled={!canManage}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password / App Password *</Label>
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Your app password"
                required
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>From Address</Label>
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="MessMate &lt;noreply@yourdomain.com&gt;"
              disabled={!canManage}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the username email as sender.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage ? (
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save email settings"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTest()}
              disabled={testing || !host || !user}
            >
              {testing ? "Sending…" : "Send test email"}
            </Button>
          </div>

          {testResult ? (
            <p className={`text-sm ${testResult.includes("sent") ? "text-emerald-600" : "text-rose-600"}`}>
              {testResult}
            </p>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Common SMTP Settings</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Gmail:</strong> smtp.gmail.com, port 587, use App Password</li>
              <li><strong>Outlook:</strong> smtp.office365.com, port 587</li>
              <li><strong>Yahoo:</strong> smtp.mail.yahoo.com, port 587, use App Password</li>
              <li><strong>Mailgun:</strong> smtp.mailgun.org, port 587</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CategoryEditorDialog({
  category,
  orgId,
  onClose,
  onSaved,
}: {
  category: ExpenseCategory | null;
  orgId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [isFood, setIsFood] = useState(category?.isFood ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      if (category) {
        await api.patch(`/api/organizations/${orgId}/expense-categories/${category._id}`, { name, isFood });
        toast.success("Category updated");
      } else {
        await api.post(`/api/organizations/${orgId}/expense-categories`, { name, isFood });
        toast.success("Category created");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save category");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Food categories split meal-based expenses by meal units.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Groceries" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Food category</p>
              <p className="text-xs text-muted-foreground">Distributed by meal units (MEAL_BASED).</p>
            </div>
            <Switch checked={isFood} onCheckedChange={setIsFood} />
          </label>
          <p className="text-xs text-rose-600">{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MethodEditorDialog({
  method,
  orgId,
  onClose,
  onSaved,
}: {
  method: PaymentMethod | null;
  orgId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(method?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      if (method) {
        await api.patch(`/api/organizations/${orgId}/payment-methods/${method._id}`, { name });
        toast.success("Payment method updated");
      } else {
        await api.post(`/api/organizations/${orgId}/payment-methods`, { name });
        toast.success("Payment method created");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save payment method");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{method ? "Edit payment method" : "New payment method"}</DialogTitle>
          <DialogDescription>e.g. bKash, Nagad, Cash.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. bKash" />
          </div>
          <p className="text-xs text-rose-600">{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleEditorDialog({
  orgId,
  onClose,
  onSaved,
}: {
  orgId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/organizations/${orgId}/roles`, {
        name,
        key: key.toUpperCase(),
        permissions,
      });
      toast.success("Role created");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>A custom permission set you can assign when inviting or editing members.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cashier" />
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                placeholder="CASHIER"
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <Label>Permissions</Label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ALL_PERMISSIONS.map((permission) => (
                <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="size-3.5 rounded accent-primary"
                  />
                  <span className="font-mono">{permission}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-rose-600">{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DEV_KEEP_COLLECTIONS = [
  { name: "users", desc: "User accounts" },
  { name: "organizations", desc: "Organizations" },
  { name: "organization_members", desc: "Memberships" },
  { name: "roles", desc: "Roles & permissions" },
  { name: "expense_categories", desc: "Expense categories" },
  { name: "payment_methods", desc: "Payment methods" },
  { name: "meal_configs", desc: "Meal configs" },
  { name: "meal_types", desc: "Meal types" },
];

const DEV_REMOVE_COLLECTIONS = [
  { name: "expenses", desc: "All expenses" },
  { name: "payments", desc: "All payments" },
  { name: "adjustments", desc: "All adjustments" },
  { name: "monthly_cycles", desc: "All monthly cycles" },
  { name: "member_monthly_summaries", desc: "All member summaries" },
  { name: "settlements", desc: "All settlements" },
  { name: "settlement_transactions", desc: "All settlement transactions" },
  { name: "meal_entries", desc: "All meal entries" },
  { name: "meal_day_statuses", desc: "All meal day statuses" },
  { name: "invitations", desc: "All invitations" },
  { name: "notifications", desc: "All notifications" },
  { name: "audit_logs", desc: "All audit logs" },
  { name: "files", desc: "All uploaded files" },
  { name: "password_reset_tokens", desc: "All password reset tokens" },
  { name: "subscriptions", desc: "All subscriptions" },
];

function DevResetSection() {
  const [confirmMode, setConfirmMode] = useState<"full" | "partial" | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleReset = async (mode: "full" | "partial") => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "messmate-dev-reset-2026", mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(`Done! Dropped ${data.dropped.length} collections (${mode} reset).`);
      setConfirmMode(null);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Partial Reset */}
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Reset Transactional Data
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
            Removes expenses, payments, meals, settlements, cycles. Keeps users, orgs, roles, categories.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Keeps:</p>
            <ul className="space-y-0.5">
              {DEV_KEEP_COLLECTIONS.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="font-mono">{c.name}</span>
                  <span className="text-muted-foreground">— {c.desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-destructive">Deletes:</p>
            <ul className="space-y-0.5">
              {DEV_REMOVE_COLLECTIONS.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="font-mono">{c.name}</span>
                  <span className="text-muted-foreground">— {c.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800" onClick={() => setConfirmMode("partial")} disabled={busy}>
          Reset Transactions Only
        </Button>
      </div>

      {/* Full Reset */}
      <div className="space-y-3">
        <Separator />
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Full Reset — Delete Everything
          </p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
            Drops ALL collections. You will need to sign up again.
          </p>
        </div>

        <Button variant="destructive" onClick={() => setConfirmMode("full")} disabled={busy}>
          Reset Everything
        </Button>
      </div>

      {result ? (
        <p className={`text-sm ${result.includes("Done") ? "text-emerald-600" : "text-rose-600"}`}>
          {result}
        </p>
      ) : null}

      {/* Confirmation Dialog */}
      <Dialog open={confirmMode !== null} onOpenChange={(open) => !open && setConfirmMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {confirmMode === "full" ? "Delete everything?" : "Delete transactional data?"}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === "full"
                ? "This cannot be undone. ALL collections will be permanently deleted:"
                : "This cannot be undone. The following collections will be permanently deleted:"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto rounded-lg border px-4 py-2">
            <ul className="space-y-1 text-sm">
              {(confirmMode === "full"
                ? [...DEV_KEEP_COLLECTIONS, ...DEV_REMOVE_COLLECTIONS]
                : DEV_REMOVE_COLLECTIONS
              ).map((col) => (
                <li key={col.name} className="flex items-center justify-between py-0.5">
                  <span className="font-mono text-xs">{col.name}</span>
                  <span className="text-xs text-muted-foreground">{col.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMode(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { if (confirmMode) void handleReset(confirmMode); }} disabled={busy}>
              {busy ? "Deleting…" : confirmMode === "full" ? "Yes, delete everything" : "Yes, delete transactions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
