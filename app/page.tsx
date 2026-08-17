import Link from "next/link";
import {
  Utensils,
  Receipt,
  HandCoins,
  BarChart3,
  Scale,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Receipt,
    title: "Expenses & Bazar",
    description:
      "Record every expense with 6 smart distribution methods — equal share, meal based, percentage, fixed amount and more.",
  },
  {
    icon: Utensils,
    title: "Daily meal tracking",
    description:
      "Mark meals per member per day with configurable meal types and weights. No more arguments about who ate what.",
  },
  {
    icon: HandCoins,
    title: "Payments",
    description:
      "Track contributions, advances and refunds with configurable payment methods like bKash, Nagad and cash.",
  },
  {
    icon: Scale,
    title: "Automatic settlements",
    description:
      "After each month's accounting, MessMate calculates exactly who owes whom and generates settlement transactions.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description:
      "Dashboards, expense breakdowns, member totals, meal analytics and period-over-period comparisons.",
  },
  {
    icon: Users,
    title: "Member roles & permissions",
    description:
      "Owners, admins and members with granular permissions — plus fully custom roles for your household.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Utensils className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">MessMate</span>
        </div>
        <nav className="flex items-center gap-3">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Get started
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-24">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Built for shared households
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Run your mess with less friction, more fairness
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            MessMate handles monthly expenses, meal tracking, bazar, payments and
            settlements automatically — so everyone pays their fair share without the drama.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Create your mess
            </Button>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything a shared household needs
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            From monthly calculation to settlement in one click
          </h2>
          <p className="mt-4 text-muted-foreground">
            At the end of every month MessMate calculates each member&apos;s share, computes net
            balances, and generates a settlement so everyone can pay or receive their exact amount.
          </p>
          <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/register" />}>
            Get started free
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} MessMate</span>
          <span>Mess management made fair.</span>
        </div>
      </footer>
    </div>
  );
}
