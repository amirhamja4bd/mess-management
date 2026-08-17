import Link from "next/link";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Utensils className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">MessMate</span>
      </Link>
      <div className={cn("w-full max-w-sm", className)}>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}
