"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Layers,
  Menu,
  PlusCircle,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-sidebar-collapsed";

const NAV_ITEMS = [
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/orders/new", label: "New order", icon: PlusCircle },
  { href: "/catalog", label: "Catalog", icon: Layers },
  { href: "/sales", label: "Sales", icon: BadgePercent },
];

// Two independent renderings rather than one component juggling both:
// desktop's collapse-to-icons sidebar is unchanged from before (just gated
// to md:), and mobile gets its own simple off-canvas drawer — full width,
// no collapse mode, since collapsing only makes sense when the sidebar is
// permanently eating screen space, not when it's a temporary overlay.
export function Sidebar({ staffName }: { staffName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  // Close the mobile drawer on every navigation instead of leaving it open
  // over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      {/* Mobile top bar — the only permanently-visible chrome below md.
          The full nav lives in the off-canvas drawer instead, since there's
          no screen real estate to spare for a permanent sidebar on a phone. */}
      <div className="flex items-center justify-between border-b border-parchment/10 bg-ink px-4 py-3 text-parchment md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-parchment/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">Saad Attarwala</span>
        <span className="w-8" aria-hidden />
      </div>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-ink/60 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-parchment transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-parchment/10 px-4 py-5">
          <span className="text-sm font-semibold tracking-tight">Saad Attarwala</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1.5 hover:bg-parchment/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-parchment/10",
                pathname === href && "bg-parchment/10"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-parchment/10 px-4 py-4 text-xs text-parchment/70">
          <span className="truncate">{staffName}</span>
          <SignOutButton />
        </div>
      </aside>

      {/* Desktop sidebar — sticky so it stays pinned to the viewport while
          the page content scrolls, instead of scrolling away with it on any
          page taller than the screen. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-ink text-parchment transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center justify-between border-b border-parchment/10 px-4 py-5">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight">Saad Attarwala</span>
          )}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "shrink-0 rounded-md p-1.5 transition-colors hover:bg-parchment/10",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-parchment/10",
                  active && "bg-parchment/10",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "flex items-center border-t border-parchment/10 px-4 py-4 text-xs text-parchment/70",
            collapsed ? "flex-col gap-3" : "justify-between gap-2"
          )}
        >
          {!collapsed && <span className="truncate">{staffName}</span>}
          <SignOutButton iconOnly={collapsed} />
        </div>
      </aside>
    </>
  );
}
