"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AuthCard, FieldError } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/frontend/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that email, a password reset link has been sent."
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Follow the link in your inbox to choose a new password.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a reset link"
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
