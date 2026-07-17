"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Icons.overview;
  exact?: boolean;
  disabled?: boolean;
};

const navigation: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: Icons.overview,
    exact: true,
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: Icons.clients,
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks",
    icon: Icons.tasks,
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: Icons.reports,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/35"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-white text-[#181818]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}