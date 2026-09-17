import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Globe, LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

type Props = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  wideCenter?: boolean;
  onOpenMenu?: () => void;
  userProfile: UserProfile | null;
  dark: boolean;
  onToggleDark: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
};

const ICON_BTN =
  "relative flex items-center justify-center w-9 h-9 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

const MENU_ITEM =
  "flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left focus:outline-none";

export default function AppNavbar({
  left,
  center,
  right,
  wideCenter = false,
  onOpenMenu,
  userProfile,
  dark,
  onToggleDark,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const name = userProfile?.display_name || userProfile?.username || "User";
  const username = userProfile?.username || "";

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <header
        className={`sticky top-0 z-30 transition-colors duration-200 ${
          scrolled
            ? "bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div
          className={`grid items-center gap-2 px-3 h-14 ${
            wideCenter ? "grid-cols-[1fr_minmax(0,2fr)_1fr]" : "grid-cols-[1fr_auto_1fr]"
          }`}
        >
          <div className="flex items-center min-w-0">
            {onOpenMenu && (
              <button
                onClick={onOpenMenu}
                title="Menu"
                aria-label="Open menu"
                className="lg:hidden mr-1 -ml-1 rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Menu size={20} />
              </button>
            )}
            {left}
          </div>
          <div
            className={`w-full hidden md:block ${
              wideCenter ? "max-w-2xl justify-self-center" : "max-w-md"
            }`}
          >
            {center}
          </div>
          <div className="flex items-center justify-end gap-0.5">
            {right}
            <button className={ICON_BTN} title="Language">
              <Globe size={18} strokeWidth={2} />
            </button>
            <button className={ICON_BTN} title="Notifications">
              <Bell size={18} strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
            </button>
            <button
              className={ICON_BTN}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleDark}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative ml-1.5" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="Menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="shrink-0 rounded-full transition-all hover:ring-2 hover:ring-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Avatar name={username || "?"} size={34} src={userProfile?.avatar_url} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-black/40 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {name}
                    </p>
                    {username && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        @{username}
                      </p>
                    )}
                  </div>
                  <div className="p-1.5">
                    <button
                      role="menuitem"
                      className={MENU_ITEM}
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenProfile();
                      }}
                    >
                      <User size={15} className="text-zinc-400" />
                      My Profile
                    </button>
                    {onOpenSettings && (
                      <button
                        role="menuitem"
                        className={MENU_ITEM}
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenSettings();
                        }}
                      >
                        <Settings size={15} className="text-zinc-400" />
                        Settings
                      </button>
                    )}
                    <button
                      role="menuitem"
                      className={MENU_ITEM}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleDark();
                      }}
                    >
                      {dark ? (
                        <Sun size={15} className="text-zinc-400" />
                      ) : (
                        <Moon size={15} className="text-zinc-400" />
                      )}
                      {dark ? "Light mode" : "Dark mode"}
                    </button>
                  </div>
                  {onLogout && (
                    <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left focus:outline-none"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {center && <div className="md:hidden px-3 pb-2.5">{center}</div>}
      </header>
    </>
  );
}