import { Link, useLocation } from "wouter";
import {
  CalendarRange,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

const NAV_ITEMS = [
  { label: "Live Agenda", icon: CalendarRange, href: "/live-agenda" },
  { label: "Speakers", icon: Users, href: "/speakers" },
  { label: "Pipeline", icon: KanbanSquare, href: "/pipeline" },
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { signOut, user } = useAuth();
  const { profile, effectiveRole, toggleViewAs } = useProfile();

  const isOrganiser = effectiveRole === "organiser";
  const isViewingOverride = effectiveRole !== profile.user_role;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function isActive(href: string) {
    if (href === "/live-agenda") return location === "/" || location === "" || location.startsWith("/live-agenda");
    return location.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          sinoo
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(href)
                ? "bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)] font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon
              size={16}
              className={isActive(href) ? "text-[hsl(243,75%,55%)]" : ""}
            />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-3 border-t border-border pt-3 flex flex-col gap-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            location.startsWith("/settings")
              ? "bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)] font-medium"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Settings
            size={16}
            className={location.startsWith("/settings") ? "text-[hsl(243,75%,55%)]" : ""}
          />
          Settings
        </Link>

        <button
          onClick={toggleViewAs}
          title={`Viewing as ${effectiveRole}${isViewingOverride ? " (preview)" : ""}. Click to switch view.`}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground w-full text-left"
        >
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              isOrganiser ? "bg-[hsl(243,75%,59%)]" : "bg-amber-500"
            }`}
          />
          <span className="text-xs">
            {isOrganiser ? "Organiser" : "Salesperson"}
          </span>
          {isViewingOverride && (
            <span className="text-[10px] text-muted-foreground ml-auto">preview</span>
          )}
        </button>

        {user && (
          <div className="px-3 pt-1 pb-0.5">
            <p className="text-xs text-muted-foreground truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full text-left"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
