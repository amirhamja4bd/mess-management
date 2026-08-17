import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { requireActiveUser } from "@/lib/auth/session";
import { getUserOrganizations } from "@/lib/services/organization.service";
import type { OrgOption } from "@/lib/frontend/org-context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  const memberships = await getUserOrganizations(user);

  if (memberships.length === 0) {
    redirect("/new-organization");
  }

  const orgs: OrgOption[] = memberships.map((membership) => ({
    organizationId: membership.organization._id.toString(),
    name: membership.organization.name,
    slug: membership.organization.slug,
    currency: membership.organization.settings?.currency ?? "BDT",
    roleKey: membership.roleKey,
    memberId: membership.memberId,
  }));

  const cookieOrgId = (await cookies()).get("activeOrganizationId")?.value ?? null;
  const initialOrgId =
    cookieOrgId && orgs.some((org) => org.organizationId === cookieOrgId)
      ? cookieOrgId
      : orgs[0].organizationId;

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      orgs={orgs}
      initialOrgId={initialOrgId}
    >
      {children}
    </AppShell>
  );
}
