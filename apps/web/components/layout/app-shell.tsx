"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Home, Library, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminBasePath } from "@/lib/admin-path";

const publicNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/stats", label: "Stats", icon: LineChart },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Binge" width={40} height={40} className="size-10 rounded-xl" priority />
            <div>
              <p className="font-bold leading-none">Binge</p>
              <p className="text-xs text-muted-foreground">TV Journal</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {publicNav.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {publicNav.map((item) => (
            <MobileNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </div>
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href as "/"} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground">
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function MobileNavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href as "/"} className={cn("flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] text-muted-foreground")}>
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

const adminNav = [
  { href: adminBasePath(), label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/stats", label: "Stats" },
  { href: "/", label: "Site" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-card/40 p-6 md:block">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="Binge" width={40} height={40} className="size-10 rounded-xl" />
          <div>
            <p className="font-bold">Binge Admin</p>
            <p className="text-xs text-muted-foreground">Journal workspace</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {adminNav.map((item) => (
            <AdminNavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </aside>

      <div className="min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Image src="/logo.png" alt="Binge" width={32} height={32} className="size-8 rounded-lg" />
            <p className="font-semibold">Workspace</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href as "/"}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as "/"} className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
      {label}
    </Link>
  );
}
