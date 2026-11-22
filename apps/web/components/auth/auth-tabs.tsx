"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
];

export function AuthTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Authentication"
      className="grid grid-cols-2 gap-1 border rounded-lg bg-muted"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
