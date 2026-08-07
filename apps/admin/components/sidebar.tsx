"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Layers,
  PlusCircle,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-sidebar-collapsed";

const NAV_ITEMS = [
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/orders/new", label: "New order", icon: PlusCircle },
  { href: "/catalog", label: "Catalog", icon: Layers },
];

// Collapse state lives in localStorage (not cookies/URL) since it's a pure
// display preference for whoever's on this browser — no reason to make it
// part of navigation state or round-trip it through the server.
export function Sidebar({ staffName }: { staffName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "shrink-0 bg-ink text-parchment flex flex-col transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="px-4 py-5 flex items-center justify-between border-b border-parchment/10">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Saad Attarwala</span>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "rounded-md p-1.5 hover:bg-parchment/10 transition-colors shrink-0",
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

      <nav className="flex-1 px-2 py-3 space-y-1 text-sm">
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
          "px-4 py-4 border-t border-parchment/10 text-xs text-parchment/70 flex items-center",
          collapsed ? "flex-col gap-3" : "justify-between gap-2"
        )}
      >
        {!collapsed && <span className="truncate">{staffName}</span>}
        <SignOutButton iconOnly={collapsed} />
      </div>
    </aside>
  );
}
