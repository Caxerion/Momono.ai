import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Pencil,
  User,
  Users,
  UserPlus,
  UserMinus,
  MessageSquare,
  MoreHorizontal,
  ThumbsUp,
  Star,
  Flag,
} from "lucide-react";
import Avatar from "./Avatar";
import type { UserProfile, Persona } from "../types";

type Props = {
  profile: UserProfile;
  token: string | null;
  onBack: () => void;
  onSaved?: (updated: UserProfile) => void;
  /**
   * Semua data di bawah ini opsional — kalau parent belum kirim, tampilannya
   * tetap aman (angka 0 / list kosong). Isi dari state atau fetch yang sudah
   * kamu punya di parent, contoh:
   *   followersCount={followers.length}
   *   followingCount={following.length}
   *   createdPersonas={myPersonas}
   *   favoritedPersonas={favorites}
   */
  editable?: boolean;
  followersCount?: number;
  followingCount?: number;
  createdPersonas?: Persona[];
  favoritedPersonas?: Persona[];
  onSelectPersona?: (personaId: string) => void;
  onEditPersona?: (persona: Persona) => void;
  onViewUser?: (userId: number | string) => void;
};

function PersonaCard({
  persona,
  conversationCount = 0,
  onClick,
  onEdit,
  onViewUser,
}: {
  persona: Persona;
  conversationCount?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onViewUser?: (userId: number | string) => void;
}) {
  const categories = (persona.categories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const visibleCategories = categories.slice(0, 3);
  const extraCount = categories.length - visibleCategories.length;

  const likes = persona.likes ?? 0;
  const dislikes = persona.dislikes ?? 0;
  const totalReactions = likes + dislikes;
  const likePercent = totalReactions > 0 ? Math.round((likes / totalReactions) * 100) : 0;

  return (
    <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors overflow-hidden">
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          title="Edit Character"
          className="absolute top-3 right-3 z-10 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
      <button onClick={onClick} className="w-full p-4 flex items-start gap-4 text-left">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-500 flex items-center justify-center text-white font-bold text-xl">
          {persona.avatar_url ? (
            <img
              src={persona.avatar_url}
              alt={persona.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{persona.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {persona.name}
          </p>
          {persona.created_by && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (persona.user_id) onViewUser?.(persona.user_id);
              }}
              className="text-xs font-medium text-emerald-500 dark:text-emerald-400 truncate mt-0.5 hover:underline"
            >
              @{persona.created_by}
            </button>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate min-h-4 mt-0.5">
            {persona.title ?? ""}
          </p>

          {/* Categories */}
          {visibleCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {visibleCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 whitespace-nowrap"
                >
                  {cat}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                  +{extraCount}
                </span>
              )}
            </div>
          )}

          {/* Stats: cukup bubble chat (jumlah) + persentase like */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <MessageSquare size={12} />
              {conversationCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <ThumbsUp size={12} />
              {likePercent}%
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function UserProfilePage({
  profile,
  token,
  onBack,
  onSaved,
  editable = true,
  followersCount = 0,
  followingCount = 0,
  createdPersonas = [],
  favoritedPersonas = [],
  onSelectPersona,
  onEditPersona,
  onViewUser,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [aboutMe, setAboutMe] = useState(profile.about_me);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"created" | "favorites">("created");
  const [conversationCounts, setConversationCounts] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [followersLocal, setFollowersLocal] = useState(followersCount);
  const [followingLocal, setFollowingLocal] = useState(followingCount);
  const [favoritCount, setFavoritCount] = useState(favoritedPersonas.length);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile.id) return;
    let cancelled = false;
    const uid = String(profile.id);
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;

    fetch(`/api/users/${uid}/stats`, { headers: h })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d || d.error) return;
        setFollowersLocal(d.followers ?? 0);
        setFollowingLocal(d.following ?? 0);
        setFavoritCount(d.favorites ?? 0);
      })
      .catch(() => {});

    if (!editable) {
      fetch(`/api/users/${uid}/relation`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d || d.error) return;
          setIsFollowing(Boolean(d.following));
          setIsFavorited(Boolean(d.favorite));
        })
        .catch(() => {});
    }

    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t)) {
        setMenuOpen(false);
        setMenuPos(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onDown);
    };
  }, [profile.id, editable, token]);

  async function sendJSON(path: string, body: Record<string, unknown>) {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { method: "POST", headers: h, body: JSON.stringify(body) });
    return r.json().catch(() => null);
  }

  async function toggleFollow() {
    const d = await sendJSON(`/api/users/${profile.id}/follow`, { following: !isFollowing });
    if (d && typeof d.following === "boolean") {
      setIsFollowing(d.following);
      setFollowersLocal((c) => (d.following ? c + 1 : Math.max(0, c - 1)));
    }
    setMenuOpen(false);
    setMenuPos(null);
  }

  async function toggleFavorite() {
    const d = await sendJSON(`/api/users/${profile.id}/favorite`, { favorite: !isFavorited });
    if (d && typeof d.favorite === "boolean") {
      setIsFavorited(d.favorite);
      setFavoritCount((c) => (d.favorite ? c + 1 : Math.max(0, c - 1)));
    }
    setMenuOpen(false);
    setMenuPos(null);
  }

  async function doReport() {
    if (reporting) return;
    const reason = window.prompt("Reason for reporting this user (optional):") ?? "";
    setReporting(true);
    await sendJSON(`/api/users/${profile.id}/report`, { reason });
    setReporting(false);
    setReported(true);
    setMenuOpen(false);
    setMenuPos(null);
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    const r = await fetch("/api/auth/avatar", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (r.ok) {
      const d = await r.json();
      setAvatarUrl(d.avatar_url);
    } else {
      const text = await r.text();
      setError(text || "Failed to upload avatar");
    }
    setUploading(false);
  }

  async function removeAvatar() {
    const r = await fetch("/api/auth/avatar", {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (r.ok) {
      setAvatarUrl("");
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        username,
        display_name: displayName,
        about_me: aboutMe,
        avatar_url: avatarUrl,
      }),
    });
    if (r.ok) {
      setSaved(true);
      onSaved?.({ ...profile, username, display_name: displayName, about_me: aboutMe, avatar_url: avatarUrl });
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const text = await r.text();
      setError(text || "Failed to save");
    }
    setBusy(false);
  }

  const activeList = tab === "created" ? createdPersonas : favoritedPersonas;

  useEffect(() => {
    let cancelled = false;
    activeList.forEach((persona) => {
      fetch(`/api/conversations?persona_id=${persona.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            setConversationCounts((prev) => ({ ...prev, [persona.id]: data.length }));
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [activeList, token]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      <div className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="font-semibold text-sm text-zinc-500 dark:text-zinc-400">Profile</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full p-6 sm:p-8">
          {!editing ? (
            <>
              <div className="flex items-start gap-5">
                <Avatar name={profile.username} src={profile.avatar_url} size={112} />
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white truncate">
                      {profile.display_name || profile.username}
                    </h1>
                    {/* Edit Profile dipindah ke sini: ikon pensil di samping nama,
                        konsisten dengan pola tombol edit di CharacterProfile.tsx
                        (langsung terlihat tanpa scroll, tidak makan tempat). */}
                    {editable && (
                      <button
                        onClick={() => {
                          setUsername(profile.username);
                          setDisplayName(profile.display_name);
                          setAboutMe(profile.about_me);
                          setAvatarUrl(profile.avatar_url ?? "");
                          setError("");
                          setEditing(true);
                        }}
                        title="Edit Profile"
                        className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {!editable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpen) {
                            setMenuOpen(false);
                            setMenuPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuOpen(true);
                            setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.right - 176, window.innerWidth - 190) });
                          }
                        }}
                        title="More actions"
                        className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400 mt-1">
                    @{profile.username}
                  </p>

                  {/* Followers / Following / Favorit (sebagai creator) */}
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      <Users size={15} />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {followersLocal.toLocaleString()}
                      </span>
                      Followers
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      <UserPlus size={15} />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {followingLocal.toLocaleString()}
                      </span>
                      Following
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      <Star size={15} />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {favoritCount.toLocaleString()}
                      </span>
                      Favorit
                    </span>
                  </div>
                </div>
              </div>

              {profile.about_me && (
                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                    Tentang Saya
                  </p>
                  <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                      {profile.about_me}
                    </p>
                  </div>
                </div>
              )}

              {/* Filter: karakter yang dibuat vs yang difavoritkan */}
              <div className="mt-8">
                <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setTab("created")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                      tab === "created"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    Dibuat ({createdPersonas.length})
                  </button>
                  <button
                    onClick={() => setTab("favorites")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                      tab === "favorites"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    Favorit ({favoritedPersonas.length})
                  </button>
                </div>

                <div className="mt-4">
                  {activeList.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {activeList.map((persona) => (
                        <PersonaCard
                          key={persona.id}
                          persona={persona}
                          conversationCount={conversationCounts[persona.id] ?? 0}
                          onClick={() => onSelectPersona?.(persona.id)}
                          onEdit={() => onEditPersona?.(persona)}
                          onViewUser={onViewUser}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-10 text-zinc-400 dark:text-zinc-500">
                      <MessageSquare size={28} className="mb-2 opacity-60" />
                      <p className="text-sm">
                        {tab === "created"
                          ? "No created characters by you."
                          : "No favorited characters yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
                Edit Profile
              </h2>

              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <button
                    className="relative group rounded-full overflow-hidden"
                    onClick={() => !uploading && fileRef.current?.click()}
                  >
                    <Avatar name={profile.username} src={avatarUrl} size={96} />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? (
                        <span className="text-white text-xs font-medium">Uploading...</span>
                      ) : (
                        <span className="text-white text-xs font-medium">Change</span>
                      )}
                    </div>
                  </button>
                  {avatarUrl && !uploading && (
                    <button
                      onClick={removeAvatar}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                      title="Remove photo"
                    >
                      <User size={12} />
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-zinc-400 mt-2">Click to change photo</p>
              </div>

              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username..."
              />

              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name..."
              />

              <label className="block text-sm font-medium mb-1">About Me</label>
              <textarea
                className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800 resize-y"
                rows={6}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Tell about yourself..."
              />

              <div className="flex items-center gap-3 pb-6">
                <button
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={busy || uploading || !username}
                  onClick={save}
                >
                  {uploading ? "Uploading..." : "Save"}
                </button>
                {saved && (
                  <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>
                )}
                {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dropdown: Follow/Unfollow, Favorite/Unfavorite, Report — di-portal ke body
          biar nggak kepotong overflow-y-auto punya profil */}
      {!editable &&
        menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: 176 }}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
          >
            <button
              onClick={toggleFollow}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none"
            >
              {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
            <button
              onClick={toggleFavorite}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none"
            >
              <Star size={14} fill={isFavorited ? "currentColor" : "none"} />
              {isFavorited ? "Unfavorite" : "Favorite"}
            </button>
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
            <button
              onClick={doReport}
              disabled={reporting || reported}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 focus:outline-none"
            >
              <Flag size={14} />
              {reported ? "Reported" : reporting ? "Reporting..." : "Report"}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}