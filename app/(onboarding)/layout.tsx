import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireActiveUser();
  } catch {
    redirect("/login");
  }
  return <div className="flex min-h-svh items-center justify-center p-6">{children}</div>;
}
