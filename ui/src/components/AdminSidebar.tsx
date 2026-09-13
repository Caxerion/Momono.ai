import { type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  FileWarning,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Users,
} from "lucide-react";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

export type AdminTab =
  | "dashboard"
  | "users"
  | "personas"
  | "reports"
  | "conversations";

type Props = {
  collapsed: boolean;
  tab: AdminTab;
  userProfile: UserProfile | null;
  onToggleCollapse: () => void;
  onSelectTab: (tab: AdminTab) => void;
  onBackToUser: () => void;
  onLogout: () => void;
};

const TABS: { key: AdminTab; label: string; icon: ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { key: "users", label: "Users", icon: <Users size={16} /> },
  { key: "personas", label: "Personas", icon: <Boxes size={16} /> },
  { key: "reports", label: "Reports", icon: <FileWarning size={16} /> },
  { key: "conversations", label: "Conversations", icon: <MessagesSquare size={16} /> },
];

export default function AdminSidebar(p: Props) {
  const c = p.collapsed;
  return (
    <aside
      className={`shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-screen relative transition-[width] duration-200 ease-in-out ${
        c ? "w-16" : "w-64"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={p.onToggleCollapse}
        title={c ? "Expand" : "Collapse"}
        className="absolute -right-3 top-6 z-30 w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {c ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>

      {/* Brand */}
      <div className={`pt-4 pb-3 flex items-center gap-2 ${c ? "justify-center" : "px-4"}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 shadow-md shadow-rose-500/25 flex items-center justify-center shrink-0">
          <Shield size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!c && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Momono Admin
            </p>
            <p className="text-[10px] uppercase tracking-widest text-rose-500 dark:text-rose-400 font-semibold">
              Admin Panels
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex flex-col gap-0.5 ${c ? "px-2 items-center" : "px-2"}`}>
        {TABS.map((t) => {
          const active = t.key === p.tab;
          return (
            <button
              key={t.key}
              onClick={() => p.onSelectTab(t.key)}
              title={t.label}
              className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                active
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-rose-600 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-zinc-700"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
              } ${c ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"}`}
            >
              {t.icon}
              {!c && t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Back to user side */}
      <div className={`border-t border-zinc-200 dark:border-zinc-800 py-2 ${c ? "px-2 flex justify-center" : "px-2"}`}>
        <button
          onClick={p.onBackToUser}
          title="Kembali ke sisi user"
          className={`flex items-center gap-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
            c ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
          }`}
        >
          <ArrowLeft size={15} />
          {!c && "Back to User"}
        </button>
      </div>

      {/* Profile footer */}
      {p.userProfile && (
        <div
          className={`border-t border-zinc-200 dark:border-zinc-800 py-2 ${
            c ? "px-2 flex justify-center" : "px-2.5 flex items-center gap-2.5"
          }`}
        >
          <Avatar name={p.userProfile.username} size={32} src={p.userProfile.avatar_url} />
          {!c && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                {p.userProfile.display_name || p.userProfile.username}
              </p>
              <p className="text-[11px] text-rose-500 dark:text-rose-400">@admin</p>
            </div>
          )}
          {!c && (
            <button
              onClick={p.onLogout}
              title="Logout"
              className="p-2 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
