"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/frontend/api-client";
import {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  MEMBER_PERMISSIONS,
} from "@/lib/constants/permissions";

export interface OrgOption {
  organizationId: string;
  name: string;
  slug?: string;
  currency?: string;
  roleKey: string;
  memberId: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface OrgContextValue {
  user: SessionUser;
  orgs: OrgOption[];
  currentOrg: OrgOption | null;
  switching: boolean;
  switchOrg: (organizationId: string) => Promise<void>;
  isOwner: boolean;
  can: (permission: string) => boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "messmate.activeOrganizationId";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [...ALL_PERMISSIONS],
  ADMIN: [...ADMIN_PERMISSIONS],
  MEMBER: [...MEMBER_PERMISSIONS],
};

interface OrgProviderProps {
  user: SessionUser;
  orgs: OrgOption[];
  initialOrgId: string | null;
  children: React.ReactNode;
}

/**
 * Holds the authenticated user + their organizations and the active org.
 * The active org is persisted to localStorage (for the UI) while the
 * backend keeps its own httpOnly activeOrganizationId cookie via /switch.
 *
 * Permission checks here are UX only — the backend is the security boundary.
 */
export function OrgProvider({ user, orgs, initialOrgId, children }: OrgProviderProps) {
  const router = useRouter();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    if (initialOrgId && orgs.some((o) => o.organizationId === initialOrgId)) {
      return initialOrgId;
    }
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && orgs.some((o) => o.organizationId === stored)) return stored;
    }
    return orgs[0]?.organizationId ?? null;
  });
  const [switching, setSwitching] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (currentOrgId) {
      window.localStorage.setItem(STORAGE_KEY, currentOrgId);
    }
  }, [currentOrgId]);

  const currentOrg = useMemo(
    () => orgs.find((o) => o.organizationId === currentOrgId) ?? null,
    [orgs, currentOrgId]
  );

  useEffect(() => {
    if (!currentOrg) return;
    if (overrides[currentOrg.organizationId]) return;
    let cancelled = false;
    api
      .get<{ permissions: string[] }>(`/api/organizations/${currentOrg.organizationId}/members/${currentOrg.memberId}`)
      .then((member) => {
        if (!cancelled && Array.isArray(member.permissions)) {
          setOverrides((prev) => ({ ...prev, [currentOrg.organizationId]: member.permissions }));
        }
      })
      .catch(() => {
        // MEMBERS_VIEW may be missing for plain members; defaults apply.
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrg, overrides]);

  const switchOrg = useCallback(
    async (organizationId: string) => {
      if (organizationId === currentOrgId) return;
      setSwitching(true);
      try {
        await api.post(`/api/organizations/${organizationId}/switch`);
        setCurrentOrgId(organizationId);
        router.refresh();
      } catch (error) {
        if (error instanceof ApiError) {
          window.alert(error.message);
        }
      } finally {
        setSwitching(false);
      }
    },
    [currentOrgId, router]
  );

  const value = useMemo<OrgContextValue>(() => {
    const roleBase = currentOrg ? (DEFAULT_ROLE_PERMISSIONS[currentOrg.roleKey] ?? []) : [];
    const effective = new Set([
      ...roleBase,
      ...(currentOrg ? (overrides[currentOrg.organizationId] ?? []) : []),
    ]);
    return {
      user,
      orgs,
      currentOrg,
      switching,
      switchOrg,
      isOwner: currentOrg?.roleKey === "OWNER",
      can: (permission: string) => effective.has(permission),
    };
  }, [user, orgs, currentOrg, switching, switchOrg, overrides]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
