"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AuthCard, FieldError } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/frontend/api-client";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title="Invalid invitation link"
        description="The invitation link is missing its token."
      >
        <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
          Go to sign in
        </Button>
      </AuthCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/auth/invitations/accept", {
        token,
        ...(needsAccount ? { name: name.trim(), password } : {}),
      });
      toast.success("Invitation accepted. You can now sign in.");
      router.push("/login");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not accept invitation. Please try again.";
      if (message.toLowerCase().includes("no account")) {
        setNeedsAccount(true);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="You&apos;re invited"
      description="Accept the invitation to join the organization"
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Already have an account? Sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {needsAccount ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </>
        ) : null}
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Accepting…" : "Accept invitation"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationContent />
    </Suspense>
  );
}
