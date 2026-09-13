import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Settings,
  Sparkles,
  Compass,
  Image,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import Avatar from "./Avatar";
import type { Conversation, Persona, UserProfile } from "../types";

type Props = {
  conversations: Conversation[];
  personas: Persona[];
  createdPersonas: Persona[];
  personaId: string | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  onOpenDiscover: () => void;
  onOpenGenerate: () => void;
  onOpenAdmin: () => void;
  onSelectPersona: (id: string) => void;
  onNewPersona: () => void;
  onEditPersona: (persona: Persona) => void;
  onDeleteHistory: (personaId: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
};

export default function Sidebar(p: Props) {
  const [chatsOpen, setChatsOpen] = useState(true);
  const [createdOpen, setCreatedOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [moreMenu, setMoreMenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = !!menuRef.current?.contains(target);
      const insideDropdown = !!portalRef.current?.contains(target);
      if (menuOpen && !insideTrigger && !insideDropdown) {
        setMenuOpen(null);
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const q = search.toLowerCase();
  const chatsFiltered = p.personas.filter((ps) =>
    ps.name.toLowerCase().includes(q)
  );
  const createdFiltered = p.createdPersonas.filter((ps) =>
    ps.name.toLowerCase().includes(q)
  );
  const allFiltered = [...chatsFiltered, ...createdFiltered];

  function renderList(list: Persona[], collapsed: boolean) {
    if (collapsed) {
      // Collapsed: icon-only avatar rail
      return list.map((ps) => {
        const isActive = p.personaId === ps.id;
        return (
          <button
            key={ps.id}
            onClick={() => p.onSelectPersona(ps.id)}
            title={ps.name}
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isActive
                ? "bg-indigo-100 dark:bg-indigo-900/50"
                : "hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500" />
            )}
            <Avatar name={ps.name} size={28} src={ps.avatar_url} />
          </button>
        );
      });
    }

    return list.map((ps) => {
      const hasChats = p.conversations.some((c) => c.persona_id === ps.id);
      const isActive = p.personaId === ps.id;
      const isMenuOpen = menuOpen === ps.id;
      const created = p.createdPersonas.some((cp) => cp.id === ps.id);
      return (
        <div
          key={ps.id}
          className={`group relative flex items-center gap-1 rounded-lg text-sm transition-colors ${
            isMenuOpen ? "z-20" : "z-0"
          } ${
            isActive
              ? "bg-indigo-100 dark:bg-indigo-900/50"
              : "hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500" />
          )}
          <button
            onClick={() => p.onSelectPersona(ps.id)}
            className="flex items-center gap-2.5 flex-1 min-w-0 px-2.5 py-2 focus:outline-none"
          >
            <Avatar name={ps.name} size={30} src={ps.avatar_url} />
            <div className="min-w-0 flex-1 text-left">
              <span
                className={`block truncate text-sm ${
                  isActive
                    ? "font-semibold text-indigo-700 dark:text-indigo-300"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {ps.name}
              </span>
              {created ? (
                <span className="block truncate text-xs text-indigo-400">Your creation</span>
              ) : (
                ps.title && (
                  <span className="block truncate text-xs text-zinc-400">{ps.title}</span>
                )
              )}
            </div>
            {!hasChats && (
              <span className="ml-auto shrink-0 text-[10px] font-medium text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
                new
              </span>
            )}
          </button>
          <div className="relative shrink-0 pr-1.5" ref={isMenuOpen ? menuRef : undefined}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) {
                  setMenuOpen(null);
                  setMenuPos(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuOpen(ps.id);
                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
                }
              }}
              className={`p-1.5 rounded-md text-zinc-400 hover:bg-zinc-300/70 dark:hover:bg-zinc-700 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isMenuOpen ? "opacity-100 bg-zinc-300/70 dark:bg-zinc-700" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>
      );
    });
  }

  return (
    <aside
      className={`shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-screen relative transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 z-30 w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>

      {/* Brand */}
      <div
        className={`pt-4 pb-3 flex items-center gap-2 ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            Momono.ai
          </span>
        )}
      </div>

      {/* Primary nav */}
      <nav className={`flex flex-col gap-0.5 ${collapsed ? "px-2 items-center" : "px-2"}`}>
        <button
          onClick={p.onOpenDiscover}
          title="Discover"
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            collapsed ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
          }`}
        >
          <Compass size={17} strokeWidth={2} />
          {!collapsed && "Discover"}
        </button>
        <button
          onClick={p.onOpenGenerate}
          title="Generate"
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            collapsed ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
          }`}
        >
          <Image size={17} strokeWidth={2} />
          {!collapsed && "Generate"}
        </button>
        {p.isAdmin && (
          <button
            onClick={p.onOpenAdmin}
            title="Admin Panel"
            className={`flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              collapsed ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
            }`}
          >
            <Shield size={17} strokeWidth={2} />
            {!collapsed && "Admin Panel"}
          </button>
        )}
        <button
          onClick={p.onNewPersona}
          title="Create Character"
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            collapsed ? "justify-center w-10 h-10" : "w-full px-2.5 py-2"
          }`}
        >
          <Plus size={17} strokeWidth={2.5} />
          {!collapsed && "Create Character"}
        </button>
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-3" />

      {/* Search (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-8 pr-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition-shadow"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Persona list */}
      <div
        onScroll={() => {
          if (menuOpen) {
            setMenuOpen(null);
            setMenuPos(null);
          }
        }}
        className={`pb-1 flex flex-col gap-0.5 flex-1 overflow-y-auto sidebar-scroll ${
          collapsed ? "px-2 pt-3 items-center" : "px-2"
        }`}
      >
        {!collapsed && (
          <button
            onClick={() => setChatsOpen(!chatsOpen)}
            className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <ChevronRight
              size={13}
              strokeWidth={2.5}
              className={`transition-transform duration-150 ${chatsOpen ? "rotate-90" : ""}`}
            />
            Chats
            {chatsFiltered.length > 0 && (
              <span className="ml-auto text-[11px] font-normal normal-case text-zinc-400">
                {chatsFiltered.length}
              </span>
            )}
          </button>
        )}

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            collapsed || chatsOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
            {chatsFiltered.length === 0 ? (
              !collapsed && (
                <p className="text-xs text-zinc-400 px-3 py-3">
                  {search ? `No results for "${search}"` : "No characters yet"}
                </p>
              )
            ) : (
              renderList(chatsFiltered, collapsed)
            )}
            </div>
          </div>
        </div>

        {!collapsed && (
          <button
            onClick={() => setCreatedOpen(!createdOpen)}
            className="flex items-center gap-1.5 w-full px-2.5 py-2 mt-1 rounded-lg text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <ChevronRight
              size={13}
              strokeWidth={2.5}
              className={`transition-transform duration-150 ${createdOpen ? "rotate-90" : ""}`}
            />
            Your Created
            {createdFiltered.length > 0 && (
              <span className="ml-auto text-[11px] font-normal normal-case text-zinc-400">
                {createdFiltered.length}
              </span>
            )}
          </button>
        )}

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            collapsed || createdOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
            {createdFiltered.length === 0 ? (
              !collapsed && (
                <p className="text-xs text-zinc-400 px-3 py-2">
                  No created characters yet
                </p>
              )
            ) : (
              renderList(createdFiltered, collapsed)
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / profile */}
      {p.userProfile && (
        <div
          ref={moreRef}
          className={`relative border-t border-zinc-200 dark:border-zinc-800 py-2 ${
            collapsed ? "px-2 flex justify-center" : "px-2"
          }`}
        >
          {collapsed ? (
            <button
              onClick={() => setMoreMenu((v) => !v)}
              title={p.userProfile.display_name || p.userProfile.username}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Avatar name={p.userProfile.username} size={32} src={p.userProfile.avatar_url} />
            </button>
          ) : (
            <div
              className={`flex items-center gap-1 rounded-lg transition-colors ${
                moreMenu
                  ? "bg-zinc-200/70 dark:bg-zinc-800"
                  : "hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (p.userProfile?.avatar_url) setPhotoPreview(p.userProfile.avatar_url);
                }}
                className="shrink-0 pl-2 focus:outline-none"
              >
                <Avatar name={p.userProfile.username} size={36} src={p.userProfile.avatar_url} />
              </button>
              <button
                onClick={p.onOpenProfile}
                className="min-w-0 flex-1 text-left px-2 py-2 focus:outline-none"
              >
                <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                  {p.userProfile.display_name || p.userProfile.username}
                </p>
                <p className="text-xs text-zinc-500 truncate">@{p.userProfile.username}</p>
              </button>
              <button
                onClick={() => setMoreMenu((v) => !v)}
                className="shrink-0 p-2 mr-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <Settings size={16} />
              </button>
            </div>
          )}

          {/* Dropdown: Profile / Settings / Logout */}
          {moreMenu && (
            <div
              className="absolute left-2 right-2 bottom-full mb-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-30 py-1 overflow-hidden"
              style={{ animation: "pop-in 0.18s ease-out" }}
            >
              <button
                onClick={() => {
                  setMoreMenu(false);
                  p.onOpenProfile();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700"
              >
                <User size={14} />
                Profile
              </button>
              <button
                onClick={() => {
                  setMoreMenu(false);
                  p.onOpenSettings();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700"
              >
                <Settings size={14} />
                Settings
              </button>
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
              <button
                onClick={() => {
                  setMoreMenu(false);
                  p.onLogout();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-900/20"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* Avatar preview modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setPhotoPreview(null)}
        >
          <img
            src={photoPreview}
            alt="Profile"
            className="max-w-[80vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Dropdown Edit/Delete per karakter — di-portal ke body biar nggak kepotong
          overflow-y-auto punya daftar chat, posisinya fixed ngikutin koordinat tombol ⋮ */}
      {menuOpen &&
        menuPos &&
        createPortal(
          (() => {
            const activePersona = allFiltered.find((ps) => ps.id === menuOpen);
            if (!activePersona) return null;
            return (
              <div
                ref={portalRef}
                style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: 176 }}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
              >
                <button
                  onClick={() => {
                    p.onEditPersona(activePersona);
                    setMenuOpen(null);
                    setMenuPos(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700"
                >
                  <Pencil size={14} />
                  Edit Character
                </button>
                <button
                  onClick={() => {
                    p.onDeleteHistory(activePersona.id);
                    setMenuOpen(null);
                    setMenuPos(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-900/20"
                >
                  <Trash2 size={14} />
                  Delete History
                </button>
              </div>
            );
          })(),
          document.body
        )}

      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.4); border-radius: 9999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.6); }
        @keyframes pop-in {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </aside>
  );
}