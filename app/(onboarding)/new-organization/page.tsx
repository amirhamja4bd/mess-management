"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FieldError } from "@/components/auth-card";
import { PageHeader } from "@/components/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/frontend/api-client";

interface CreateOrgResponse {
  organization: { _id: string };
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { organization } = await api.post<CreateOrgResponse>("/api/organizations", {
        name,
        slug: slug || undefined,
        description: description || undefined,
      });
      await api.post(`/api/organizations/${organization._id}/switch`);
      toast.success(`"${name}" created. Let's set it up!`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <PageHeader
        title="Create your organization"
        description="Set up a mess for your household. You'll be the owner."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>
            You can invite members and configure settings after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. House 42 Mess"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Slug <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="slug"
                placeholder="house-42-mess"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Who lives here, what's the plan…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <FieldError message={error ?? undefined} />
            <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already part of a mess?{" "}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
