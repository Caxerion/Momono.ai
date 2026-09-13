import { Bell, ChevronDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

type Props = {
  userProfile: UserProfile | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onBack: () => void;
  onLogout: () => void;
};

export default function AdminNavbar({
  userProfile,
  collapsed,
  onToggleCollapse,
  onBack,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleMenu() {
    setMenuOpen((o) => !o);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-30 shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-3 h-14">
        {/* Mobile sidebar toggle (lg:hidden) */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="lg:hidden rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 shadow-md shadow-rose-500/25 flex items-center justify-center shrink-0">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              Admin Panel
            </p>
            <p className="text-[10px] uppercase tracking-widest text-rose-500 dark:text-rose-400 font-semibold">
              Momono Control Room
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Notifications */}
        <button
          onClick={closeMenu}
          title="Notifikasi admin"
          className="relative rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
        </button>

        {/* Avatar menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="flex items-center gap-2 rounded-full pl-1 pr-1 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition-colors"
          >
            <Avatar
              name={userProfile?.username ?? "Admin"}
              src={userProfile?.avatar_url}
              size={34}
            />
            <ChevronDown size={15} className="text-zinc-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-40">
              <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {userProfile?.display_name || userProfile?.username || "Admin"}
                </p>
                <p className="text-[11px] text-zinc-400">
                  @{userProfile?.username || "admin"}
                </p>
              </div>
              <button
                onClick={() => {
                  closeMenu();
                  onBack();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
              >
                <ShieldCheck size={14} />
                Kembali ke User
              </button>
              <button
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
