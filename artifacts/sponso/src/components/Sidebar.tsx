import { Link, useLocation } from "wouter";
import {
  CalendarRange,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  LogOut,
  Users,
  Target,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

const ORGANISER_NAV = [
  { label: "Live Agenda", icon: CalendarRange, href: "/live-agenda" },
  { label: "Speakers", icon: Users, href: "/speakers" },
  { label: "Pipeline", icon: KanbanSquare, href: "/pipeline" },
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
];

const SALESPERSON_NAV = [
  { label: "Live Agenda", icon: CalendarRange, href: "/live-agenda" },
  { label: "Prospects", icon: Target, href: "/prospects" },
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
    <aside className="w-52 shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "#1C1C1E" }}>
      {/* Wordmark */}
      <div className="px-5 py-5 shrink-0">
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: "white", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          sinoo
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {(isOrganiser ? ORGANISER_NAV : SALESPERSON_NAV).map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "white" : "rgba(255,255,255,0.45)",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              <Icon size={15} style={{ color: active ? "#EF9F27" : "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 shrink-0" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
        <Link
          href="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: location.startsWith("/settings") ? "white" : "rgba(255,255,255,0.45)",
            background: location.startsWith("/settings") ? "rgba(255,255,255,0.08)" : "transparent",
            textDecoration: "none",
            marginBottom: 2,
          }}
        >
          <Settings size={15} style={{ color: "rgba(255,255,255,0.35)" }} />
          Settings
        </Link>

        <button
          onClick={toggleViewAs}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: isOrganiser ? "#EF9F27" : "rgba(255,255,255,0.3)",
          }} />
          <span>{isOrganiser ? "Organiser" : "Salesperson"}</span>
          {isViewingOverride && (
            <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>preview</span>
          )}
        </button>

        {user && (
          <div style={{ padding: "4px 10px" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <LogOut size={15} style={{ color: "rgba(255,255,255,0.25)" }} />
          Sign out
        </button>
      </div>
    </aside>
  );
}