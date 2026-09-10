"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = { href: string; label: string };

const adminItems: NavigationItem[] = [
  { href: "/admin/test", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/workers", label: "Workers" },
];

const workerItems: NavigationItem[] = [
  { href: "/worker/dashboard", label: "Dashboard" },
  { href: "/worker/dashboard#orders", label: "My Orders" },
  { href: "/worker/dashboard#active", label: "Active Job" },
  { href: "/worker/profile", label: "Profile" },
];

export function Sidebar({ role }: { role: "admin" | "owner" | "worker" }) {
  const pathname = usePathname();
  const isAdmin = role === "admin" || role === "owner";
  const items = isAdmin ? adminItems : workerItems;

  return (
    <aside className="border-b border-black/10 bg-white md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:block">
        <p className="text-sm font-semibold tracking-wide">WashOps</p>
        <nav className="flex gap-1 overflow-x-auto md:mt-8 md:block md:space-y-1">
          {items.map((item) => {
            const active = pathname === item.href.split("#")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block whitespace-nowrap rounded px-3 py-2 text-sm ${
                  active ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}