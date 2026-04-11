import { Link, useLocation } from "wouter";
import {
  CalendarDays,
  Users,
  Send,
  LayoutDashboard,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Agenda Input", icon: CalendarDays, href: "/" },
  { label: "Prospects", icon: Users, href: "/prospects" },
  { label: "Campaigns", icon: Send, href: "/campaigns" },
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-white h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          sinoo
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const isActive =
            href === "/"
              ? location === "/" || location === ""
              : location.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)] font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon
                size={16}
                className={isActive ? "text-[hsl(243,75%,55%)]" : ""}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-border pt-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            location.startsWith("/settings")
              ? "bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)] font-medium"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Settings size={16} className={location.startsWith("/settings") ? "text-[hsl(243,75%,55%)]" : ""} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
