"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Utensils,
  HandCoins,
  Users,
  Calculator,
  Scale,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  LogOut,
  Building2,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrgProvider, useOrg, type OrgOption, type SessionUser } from "@/lib/frontend/org-context";
import { api } from "@/lib/frontend/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect } from "react";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission: string }>;
}> = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "reports.view" }],
  },
  {
    label: "Daily",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt, permission: "expenses.view" },
      { href: "/bazar", label: "Bazar", icon: ShoppingCart, permission: "expenses.view" },
      { href: "/meals", label: "Meals", icon: Utensils, permission: "meals.view" },
      { href: "/payments", label: "Payments", icon: HandCoins, permission: "payments.view" },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/members", label: "Members", icon: Users, permission: "members.view" },
      { href: "/accounting", label: "Accounting", icon: Calculator, permission: "reports.view" },
      { href: "/settlements", label: "Settlements", icon: Scale, permission: "settlement.manage" },
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
      { href: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings.view" },
    ],
  },
];

function NavContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const { can, currentOrg, orgs, switchOrg, user } = useOrg();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {!collapsed && (
        <>
          <div className="flex items-center gap-2 px-4 pb-2 pt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Utensils className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">MessMate</p>
              <p className="text-xs text-muted-foreground">Mess management</p>
            </div>
          </div>

          <div className="px-3 pb-3 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="w-full justify-between" size="sm" />
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{currentOrg?.name ?? "Select organization"}</span>
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {orgs.map((org: OrgOption) => (
                  <DropdownMenuItem
                    key={org.organizationId}
                    onSelect={() => {
                      void switchOrg(org.organizationId);
                      onNavigate?.();
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="flex-1 truncate">{org.name}</span>
                    <span className="text-xs text-muted-foreground">{org.roleKey}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}

      {collapsed && (
        <div className="flex justify-center px-3 pb-3 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" className="h-8 w-8" />
              }
              aria-label="Select organization"
            >
              <Building2 className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orgs.map((org: OrgOption) => (
                <DropdownMenuItem
                  key={org.organizationId}
                  onSelect={() => {
                    void switchOrg(org.organizationId);
                    onNavigate?.();
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{org.name}</span>
                  <span className="text-xs text-muted-foreground">{org.roleKey}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await api.post("/api/auth/logout");
              } finally {
                router.push("/");
                router.refresh();
              }
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="flex min-h-svh">
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-sidebar transition-all duration-200 md:block",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="sticky top-0 flex h-svh flex-col">
          <NavContent collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-5 z-10 hidden h-6 w-6 rounded-full border bg-background shadow-sm md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-3 md:hidden"
              aria-label="Open navigation"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="hidden">
            <SheetTitle>MessMate</SheetTitle>
          </SheetHeader>
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  orgs,
  initialOrgId,
  children,
}: {
  user: SessionUser;
  orgs: OrgOption[];
  initialOrgId: string | null;
  children: React.ReactNode;
}) {
  return (
    <OrgProvider user={user} orgs={orgs} initialOrgId={initialOrgId}>
      <ShellInner>{children}</ShellInner>
    </OrgProvider>
  );
}
