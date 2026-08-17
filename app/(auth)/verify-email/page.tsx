"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/frontend/api-client";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post<{ message: string }>("/api/auth/verify-email", { token })
      .then((res) => {
        if (!cancelled) {
          setState("done");
          setMessage(res.message);
          toast.success(res.message);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState("error");
          setMessage(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <AuthCard
        title="Verification failed"
        description="Verification link is missing its token."
      >
        <Button className="w-full" onClick={() => router.push("/login")}>
          Continue to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={state === "loading" ? "Verifying…" : state === "done" ? "Email verified" : "Verification failed"}
      description={state === "loading" ? "Please wait while we confirm your email." : message}
    >
      {state !== "loading" ? (
        <Button className="w-full" onClick={() => router.push("/login")}>
          Continue to sign in
        </Button>
      ) : null}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
