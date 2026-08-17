"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, MailPlus, XCircle, RotateCcw, Shield, UserX } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/lib/frontend/org-context";
import { useApiData } from "@/lib/frontend/use-api-data";
import { api, type ApiListData } from "@/lib/frontend/api-client";
import type { Member, Invitation, Role } from "@/lib/frontend/api-types";
import { formatDate } from "@/lib/frontend/format";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/frontend/api-client";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";

function memberName(member: Member): string {
  return typeof member.userId === "object" ? member.userId.name : "Member";
}

function memberEmail(member: Member): string {
  return typeof member.userId === "object" ? member.userId.email ?? "" : "";
}

export default function MembersPage() {
  const { currentOrg, can } = useOrg();
  const orgId = currentOrg?.organizationId;
  const canManage = can("members.manage");
  const canInvite = can("members.invite");

  const { data, error, loading, reload } = useApiData<ApiListData<Member>>(
    async () => api.get<ApiListData<Member>>(`/api/organizations/${orgId}/members?limit=100`),
    [orgId]
  );

  const { data: invitations, reload: reloadInvitations } = useApiData<Invitation[]>(
    async () => api.get<Invitation[]>(`/api/organizations/${orgId}/invitations`),
    [orgId]
  );

  const { data: roles } = useApiData<Role[]>(
    async () =>
      can("settings.view")
        ? api.get<Role[]>(`/api/organizations/${orgId}/roles`)
        : [],
    [orgId, can("settings.view")]
  );

  const customRoles = (roles ?? []).filter((role) => role.kind === "CUSTOM" && role.isActive);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirming, setConfirming] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null);
  const [roleEditor, setRoleEditor] = useState<Member | null>(null);

  const members = data?.items ?? [];

  const suspend = async (member: Member) => {
    try {
      await api.post(`/api/organizations/${orgId}/members/${member._id}/suspend`);
      toast.success("Member suspended");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to suspend member");
    }
  };

  const restore = async (member: Member) => {
    try {
      await api.post(`/api/organizations/${orgId}/members/${member._id}/restore`);
      toast.success("Member restored");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to restore member");
    }
  };

  const remove = async (member: Member) => {
    try {
      await api.delete(`/api/organizations/${orgId}/members/${member._id}`);
      toast.success("Member removed");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove member");
    }
  };

  const cancelInvitation = async (invitation: Invitation) => {
    try {
      await api.post(`/api/organizations/${orgId}/invitations/${invitation._id}/cancel`);
      toast.success("Invitation cancelled");
      reloadInvitations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel invitation");
    }
  };

  const resendInvitation = async (invitation: Invitation) => {
    try {
      await api.post(`/api/organizations/${orgId}/invitations/${invitation._id}/resend`);
      toast.success("Invitation re-sent");
      reloadInvitations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to resend invitation");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Everyone in your organization">
        {canInvite ? (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Invite member
          </Button>
        ) : null}
      </PageHeader>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingState /> : null}
      {data && members.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Invite people to join your mess."
          action={
            canInvite ? (
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Invite member
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {data && members.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member._id === currentOrg?.memberId;
                return (
                  <TableRow key={member._id}>
                    <TableCell>
                      <p className="font-medium">{memberName(member)}{isSelf ? " (you)" : ""}</p>
                      <p className="text-xs text-muted-foreground">{memberEmail(member)}</p>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{member.roleKey.toLowerCase()}</span>
                      {typeof member.roleId === "object" && member.roleId?.name ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {member.roleId.name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(member.joinedAt)}</TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.roleKey !== "OWNER" ? (
                              <>
                                <DropdownMenuItem onClick={() => setRoleEditor(member)}>
                                  <Shield className="mr-2 h-4 w-4" /> Change role / permissions
                                </DropdownMenuItem>
                                {member.status === "ACTIVE" ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      setConfirming({
                                        title: "Suspend member?",
                                        description: `${memberName(member)} won't be able to use the organization until restored.`,
                                        action: () => suspend(member),
                                      })
                                    }
                                  >
                                    <UserX className="mr-2 h-4 w-4" /> Suspend
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirming({
                                        title: "Restore member?",
                                        description: `${memberName(member)} will regain access.`,
                                        action: () => restore(member),
                                      })
                                    }
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" /> Restore
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                            {member.status === "SUSPENDED" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirming({
                                    title: "Remove member?",
                                    description: `${memberName(member)} will be removed from this organization.`,
                                    action: () => remove(member),
                                  })
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {invitations && invitations.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Invitations
          </h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canInvite ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation._id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell className="capitalize">{invitation.roleKey.toLowerCase()}</TableCell>
                    <TableCell>
                      <StatusBadge status={invitation.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(invitation.createdAt)}</TableCell>
                    {canInvite ? (
                      <TableCell className="text-right">
                        {invitation.status === "PENDING" ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => void resendInvitation(invitation)}>
                              <MailPlus className="mr-1 h-3.5 w-3.5" /> Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600"
                              onClick={() => void cancelInvitation(invitation)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgId={orgId ?? ""}
        onSaved={() => {
          reloadInvitations();
        }}
      />

      {roleEditor ? (
        <RoleEditorDialog
          member={roleEditor}
          orgId={orgId ?? ""}
          customRoles={customRoles}
          onClose={() => setRoleEditor(null)}
          onSaved={() => {
            setRoleEditor(null);
            reload();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming?.title ?? ""}
        description={confirming?.description}
        onConfirm={async () => {
          await confirming?.action();
        }}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  orgId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("MEMBER");
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteLink(null);
    try {
      const result = await api.post<{ inviteLink: string }>(`/api/organizations/${orgId}/invitations`, {
        email,
        roleKey,
        message: message || undefined,
      });
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
        toast.success(`Invitation created for ${email}`);
      } else {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        setMessage("");
        onSaved();
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invitation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "Share this link with the member to join your organization."
              : "They'll receive an email with an invite link."}
          </DialogDescription>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <Label className="text-xs text-muted-foreground">Invitation link</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Send this link to <strong>{email}</strong> via WhatsApp, SMS, or any messaging app.
            </p>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setInviteLink(null);
                  setEmail("");
                  setMessage("");
                  onSaved();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleKey} onValueChange={(value) => value && setRoleKey(value)} items={[{ value: "MEMBER", label: "Member" }, { value: "ADMIN", label: "Admin" }]}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Optional personal note"
              />
            </div>
            <p className="text-xs text-rose-600">{error}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleEditorDialog({
  member,
  orgId,
  customRoles,
  onClose,
  onSaved,
}: {
  member: Member;
  orgId: string;
  customRoles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleKey, setRoleKey] = useState(member.roleKey);
  const [permissions, setPermissions] = useState<string[]>(member.permissions ?? []);

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleRoleChange = async () => {
    setBusy(true);
    setError(null);
    try {
      const customRole = customRoles.find((role) => role._id === roleKey);
      await api.patch(`/api/organizations/${orgId}/members/${member._id}`, {
        roleKey: customRole ? "MEMBER" : roleKey,
        roleId: customRole ? customRole._id : null,
      });
      toast.success("Role updated");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update role");
    } finally {
      setBusy(false);
    }
  };

  const handlePermissions = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/organizations/${orgId}/members/${member._id}/permissions`, {
        permissions,
      });
      toast.success("Permissions updated");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update permissions");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Role & permissions</DialogTitle>
          <DialogDescription>
            {typeof member.userId === "object" ? member.userId.name : "Member"} ·{" "}
            <span className="capitalize">{member.roleKey.toLowerCase()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Base role</Label>
            <Select value={roleKey} onValueChange={(value) => value && setRoleKey(value)} items={[{ value: "MEMBER", label: "Member" }, { value: "ADMIN", label: "Admin" }, ...customRoles.map((r) => ({ value: r._id, label: `${r.name} (custom)` }))]}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                {customRoles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.name} (custom)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleKey !== member.roleKey ? (
              <Button onClick={() => void handleRoleChange()} disabled={busy} className="w-full">
                Apply role
              </Button>
            ) : null}
          </div>

          {member.roleKey !== "OWNER" ? (
            <div className="space-y-3">
              <div>
                <Label>Permission overrides</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add extra permissions on top of the base role. Use with care.
                </p>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
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
              <Button onClick={() => void handlePermissions()} disabled={busy} className="w-full">
                Save permissions
              </Button>
            </div>
          ) : null}

          <p className="text-xs text-rose-600">{error}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
