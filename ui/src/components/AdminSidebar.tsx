import { type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bot,
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
  | "conversations"
  | "chat-models";

type Props = {
  collapsed: boolean;
  tab: AdminTab;
  userProfile: UserProfile | null;
  onToggleCollapse: () => void;
  onSelectTab: (tab: AdminTab) => void;
  onBackToUser: () => void;
  onLogout: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

const SECTIONS: { label: string; items: { key: AdminTab; label: string; icon: ReactNode }[] }[] = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { key: "conversations", label: "Conversations", icon: <MessagesSquare size={16} /> },
    ],
  },
  {
    label: "Moderation",
    items: [
      { key: "users", label: "Users", icon: <Users size={16} /> },
      { key: "reports", label: "Reports", icon: <FileWarning size={16} /> },
    ],
  },
{
    label: "Catalog",
    items: [
      { key: "personas", label: "Personas", icon: <BarChart3 size={16} /> },
      { key: "chat-models", label: "Chat Models", icon: <Bot size={16} /> },
    ],
  },
];

export default function AdminSidebar(p: Props) {
  const c = p.collapsed;
  return (
    <>
      {p.mobileOpen && p.onCloseMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={p.onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-screen lg:h-auto w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out ${
          p.mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 lg:z-auto lg:transition-[width] lg:duration-200 lg:ease-in-out ${
          c ? "lg:w-16" : "lg:w-64"
        }`}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={p.onToggleCollapse}
          title={c ? "Expand" : "Collapse"}
          className="hidden lg:flex absolute -right-3 top-6 z-30 w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {c ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>

      {/* Brand */}
      <div className={`pt-4 pb-3 flex items-center gap-2 ${c ? "justify-center" : "px-4"}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-lime-500 shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0">
          <Shield size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!c && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Momono Admin
            </p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 dark:text-emerald-400 font-semibold">
              Control Room
            </p>
          </div>
        )}
        {!c && (
          <span className="ml-auto shrink-0 rounded-full bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5">
            PRO
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex flex-col gap-2 ${c ? "px-2 items-center" : "px-2"}`}>
        {SECTIONS.map((s) => (
          <div key={s.label} className="w-full">
            {!c && (
              <p className="px-2.5 mb-0.5 text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold">
                {s.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {s.items.map((t) => {
                const active = t.key === p.tab;
                return (
                  <button
                    key={t.key}
                    onClick={() => p.onSelectTab(t.key)}
                    title={t.label}
                    className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      c ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
                    } ${
                      active
                        ? "bg-gradient-to-r from-emerald-500 to-lime-500 text-white shadow-md shadow-emerald-500/25"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {t.icon}
                    {!c && <span>{t.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Plan card (hidden when collapsed) */}
      {!c && (
        <div className="mx-2 mb-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-emerald-900/10 dark:to-lime-900/10 p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
              Enterprise Plan
            </span>
            <span className="ml-auto text-[10px] text-zinc-400">62%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/60 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" />
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            {p.userProfile?.display_name || p.userProfile?.username || "Admin"} · Superadmin
          </p>
        </div>
      )}

      {/* Back to user side */}
      <div className={`border-t border-zinc-200 dark:border-zinc-800 py-2 ${c ? "px-2 flex justify-center" : "px-2"}`}>
        <button
          onClick={p.onBackToUser}
          title="Kembali ke sisi user"
          className={`flex items-center gap-2 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            c ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
          }`}
        >
          <ArrowLeft size={15} />
          {!c && "Back to user"}
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
              <p className="text-[11px] text-emerald-500 dark:text-emerald-400">@admin</p>
            </div>
          )}
          {!c && (
            <button
              onClick={p.onLogout}
              title="Logout"
              className="p-2 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      )}
    </aside>
    </>
  );
}
