import { useEffect, useState } from "react";
import {
  User,
  MessageSquare,
  Share2,
  Plus,
  History,
  Eye,
  Check,
  ThumbsUp,
  ThumbsDown,
  Heart,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Bot,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Conversation, Persona, PersonaReactions } from "../types";
import { navLink } from "../lib/link";

type Props = {
  persona: Persona;
  conversations: Conversation[];
  conversationId: string | null;
  visible: boolean;
  token: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onViewProfile: (p: Persona) => void;
  onViewUser?: (userId: number | string) => void;
  tiers?: { key: string; label: string }[];
  chatModels?: { key: string; label: string; description?: string }[];
  tier?: string;
  chatModel?: string;
  onTierChange?: (t: string) => void;
  onChatModelChange?: (k: string) => void;
};

export default function CharacterSidebar({
  persona,
  conversations,
  conversationId,
  visible,
  token,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onViewProfile,
  onViewUser,
  tiers,
  chatModels,
  tier,
  chatModel,
  onTierChange,
  onChatModelChange,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showChatModels, setShowChatModels] = useState(false);
  const [reactions, setReactions] = useState<PersonaReactions>({
    likes: persona.likes ?? 0,
    dislikes: persona.dislikes ?? 0,
    my_reaction: null,
  });
  const [favorite, setFavorite] = useState(persona.favorite ?? false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [histPage, setHistPage] = useState(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const HISTORY_PAGE_SIZE = 8;
  // Fallback kalau avatar_url gagal di-load (404, CORS, dsb) — tanpa ini
  // <img> yang gagal cuma nampilin kotak putih kosong yang nutupin banner.
  const [avatarError, setAvatarError] = useState(false);

  const categories = (persona.categories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 3);
  const hasMore = categories.length > 3;

  const activeTier = (tiers ?? []).find((t) => t.key === (tier ?? "tier1"));
  const activeChatModel = (chatModels ?? []).find((m) => m.key === (chatModel ?? "standard"));

  // Reset status error setiap ganti persona, biar avatar persona baru
  // dicoba di-load lagi dari awal (bukan ketahan error dari persona sebelumnya).
  useEffect(() => {
    setAvatarError(false);
  }, [persona.id, persona.avatar_url]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/personas/${persona.id}/reactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && data.likes !== undefined) {
          setReactions(data);
        }
      })
      .catch(() => {});
    fetch(`/api/personas/${persona.id}/favorite`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data.favorite === "boolean") {
          setFavorite(data.favorite);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [persona.id, token]);

  async function handleFavorite() {
    if (favorite) {
      setShowConfirm(true);
      return;
    }
    await doToggleFavorite(true);
  }

  async function doToggleFavorite(next: boolean) {
    setFavorite(next);
    try {
      const r = await fetch(`/api/personas/${persona.id}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ favorite: next }),
      });
      const data = await r.json();
      if (r.ok && data && typeof data.favorite === "boolean") {
        setFavorite(data.favorite);
      }
    } catch {
      // revert on error
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleReaction(value: "like" | "dislike") {
    setReactions((prev) => ({ ...prev, my_reaction: value }));
    try {
      const r = await fetch(`/api/personas/${persona.id}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ value }),
      });
      const data = await r.json();
      if (r.ok && data && data.likes !== undefined) {
        setReactions(data);
      }
    } catch {
      // revert on error
    }
  }

  const showAvatarImage = Boolean(persona.avatar_url) && !avatarError;

  const totalHistoryPages = Math.max(1, Math.ceil(conversations.length / HISTORY_PAGE_SIZE));
  const historyPage = Math.min(histPage, totalHistoryPages - 1);
  const pageHistory = conversations.slice(
    historyPage * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE
  );

  function openHistory() {
    setHistPage(0);
    setRenamingId(null);
    setShowHistory(true);
  }

  function startRename(c: Conversation) {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  function saveRename(id: string) {
    const t = renameValue.trim();
    if (t) onRenameConversation(id, t);
    cancelRename();
  }

  function fmtDate(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString();
  }

  return (
    <>
      <div
        className={`w-72 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out overflow-hidden ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ marginLeft: visible ? 0 : -288 }}
      >
        <div className="w-72 h-full flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-900">
          {/* Banner header — foto profil ditampilkan penuh sebagai banner, bukan avatar bulat */}
          <div
            onClick={() => onViewProfile(persona)}
            role="button"
            tabIndex={0}
            onAuxClick={(e) => {
              if (e.button === 1) window.open(`#/profile/${persona.id}`, "_blank", "noopener,noreferrer");
            }}
            className="relative w-full h-52 shrink-0 overflow-hidden group cursor-pointer"
          >
            {showAvatarImage ? (
              <img
                src={persona.avatar_url ?? undefined}
                alt={persona.name}
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 flex items-center justify-center">
                <ImageIcon size={56} className="text-white/25" strokeWidth={1.5} />
              </div>
            )}
            {/* gradient overlay biar teks tetap terbaca di atas foto apa pun */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/0" />
            <div className="absolute bottom-4 left-4 right-4 text-left">
              <h3 className="text-xl font-bold text-white truncate drop-shadow-sm">
                {persona.name}
              </h3>
              {persona.title && (
                <p className="text-sm text-white/80 truncate">{persona.title}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/70">
                {persona.created_by && (
                  <span className="flex items-center gap-1 truncate">
                    <User size={12} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.ctrlKey || e.metaKey) {
                          if (persona.user_id)
                            window.open(`#/user/${persona.user_id}`, "_blank", "noopener,noreferrer");
                        } else if (persona.user_id) {
                          onViewUser?.(persona.user_id);
                        }
                      }}
                      onAuxClick={(e) => {
                        e.stopPropagation();
                        if (e.button === 1 && persona.user_id)
                          window.open(`#/user/${persona.user_id}`, "_blank", "noopener,noreferrer");
                      }}
                      className="truncate font-medium text-white/90 hover:underline"
                    >
                      @{persona.created_by}
                    </button>
                  </span>
                )}
                <span className="flex items-center gap-1 shrink-0">
                  <MessageSquare size={12} />
                  {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-wrap gap-1.5">
                {visibleCategories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {showAllCategories ? (
                    <>
                      See less <ChevronUp size={13} />
                    </>
                  ) : (
                    <>
                      See more ({categories.length - visibleCategories.length} more){" "}
                      <ChevronDown size={13} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Like / Dislike */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3">
            <button
              onClick={() => handleReaction("like")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                reactions.my_reaction === "like"
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-green-50 dark:hover:bg-green-900/20"
              }`}
            >
              <ThumbsUp size={16} />
              {reactions.likes}
            </button>
            <button
              onClick={() => handleReaction("dislike")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                reactions.my_reaction === "dislike"
                  ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              <ThumbsDown size={16} />
              {reactions.dislikes}
            </button>
            <button
              onClick={handleFavorite}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                favorite
                  ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              }`}
              title="Favorite"
            >
              <Heart size={16} fill={favorite ? "currentColor" : "none"} />
              <span>Favorite</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onNewChat}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <Plus size={16} />
                <span>New Chat</span>
              </button>
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
              <button
                {...navLink(`#/profile/${persona.id}`, () => onViewProfile(persona))}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <Eye size={16} />
                <span>Profile</span>
              </button>
            </div>

            <button
              onClick={() => setShowChatModels(true)}
              title="Pilih chat model"
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <Bot size={16} className="text-emerald-500 shrink-0" />
              <span>Chat Models</span>
              <span className="ml-auto text-[11px] text-zinc-400 truncate">
                {activeChatModel?.label ?? "Standard"}
                {activeTier ? ` · ${activeTier.label}` : ""}
              </span>
              <ChevronDown size={14} className="text-zinc-400 shrink-0" />
            </button>
          </div>

          {/* Chat History */}
          <div className="px-3 pb-3">
            <button
              onClick={openHistory}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <History size={16} className="text-emerald-500 shrink-0" />
              <span>Chat History</span>
              <span className="ml-auto text-[11px] text-zinc-400">{conversations.length}</span>
              <ChevronDown size={14} className="text-zinc-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Dipindah keluar dari wrapper animasi sidebar di atas — sebelumnya modal ini
          jadi anak dari div yang kena opacity-0/pointer-events-none pas sidebar
          ditutup, jadi ikut tak-terlihat & tak-bisa-diklik padahal dia fixed
          inset-0 dan seharusnya independen dari status buka-tutup sidebar. */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-80 max-w-[90vw] rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-pink-100 dark:bg-pink-900/40">
              <Heart size={26} className="text-pink-600 dark:text-pink-400" fill="currentColor" />
            </div>
            <h3 className="text-center text-base font-bold dark:text-zinc-100">
              Remove from favorites
            </h3>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                {persona.name}
              </span>{" "}
              from your favorites collection?
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  doToggleFavorite(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showChatModels && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowChatModels(false)}
        >
          <div
            className="w-96 max-w-[92vw] rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Bot size={18} className="text-emerald-500" />
                  Chat Models
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Atur mode engine dan gaya respons untuk chat ini.
                </p>
              </div>
              <button
                onClick={() => setShowChatModels(false)}
                title="Tutup"
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Mode
              </span>
              <div className="mt-1.5 flex rounded-full bg-zinc-100 dark:bg-zinc-800 p-0.5">
                {(tiers ?? []).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTierChange?.(t.key)}
                    title={t.label}
                    className={`flex-1 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      (tier ?? "tier1") === t.key
                        ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Gaya / Chat Model
              </span>
              <div className="mt-1.5 space-y-1.5 max-h-64 overflow-y-auto sidebar-scroll">
                {(chatModels ?? []).length === 0 && (
                  <p className="text-sm text-zinc-400 py-4 text-center">
                    Belum ada chat model.
                  </p>
                )}
                {(chatModels ?? []).map((m) => {
                  const active = (chatModel ?? "standard") === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => onChatModelChange?.(m.key)}
                      className={`w-full text-left flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors border ${
                        active
                          ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-transparent bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {m.label}
                        </span>
                        {m.description && (
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {m.description}
                          </span>
                        )}
                      </span>
                      {active && (
                        <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-[480px] max-w-[94vw] rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <History size={18} className="text-emerald-500" />
                  Chat History
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {conversations.length} percakapan dengan {persona.name}
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                title="Tutup"
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-[50vh] overflow-y-auto sidebar-scroll flex flex-col gap-0.5">
              {pageHistory.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">
                  Belum ada percakapan — mulai chat dulu.
                </p>
              ) : (
                pageHistory.map((c) =>
                  renamingId === c.id ? (
                    <div
                      key={c.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
                    >
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(c.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        autoFocus
                        placeholder="Nama baru..."
                        className="flex-1 min-w-0 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 outline-none placeholder:text-zinc-400"
                      />
                      <button
                        onClick={() => saveRename(c.id)}
                        title="Simpan"
                        className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelRename}
                        title="Batal"
                        className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div key={c.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => onSelectConversation(c.id)}
                        className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg transition-colors ${
                          conversationId === c.id
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`block text-sm truncate ${
                            conversationId === c.id
                              ? "text-emerald-700 dark:text-emerald-300 font-medium"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {c.title}
                        </span>
                        <span className="block text-[11px] text-zinc-400 truncate">
                          {fmtDate(c.updated_at)}
                        </span>
                      </button>
                      <button
                        onClick={() => startRename(c)}
                        title="Rename"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )
                )
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Halaman {historyPage + 1} dari {totalHistoryPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistPage(historyPage - 1)}
                  disabled={historyPage === 0}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    historyPage === 0
                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  <ChevronLeft size={14} />
                  Sebelumnya
                </button>
                <button
                  onClick={() => setHistPage(historyPage + 1)}
                  disabled={historyPage >= totalHistoryPages - 1}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    historyPage >= totalHistoryPages - 1
                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Berikutnya
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}