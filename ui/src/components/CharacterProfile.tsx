import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Pencil,
  Heart,
  Share2,
  Check,
} from "lucide-react";
import type { Persona } from "../types";
import { navLink } from "../lib/link";

type Props = {
  persona: Persona;
  onBack: () => void;
  onEdit?: (persona: Persona) => void;
  onChat: (personaId: string) => void;
  onFavorite?: (personaId: string) => void;
  isFavorite?: boolean;
  onViewUser?: (userId: number | string) => void;
  /**
   * Belum ada di tipe Persona, jadi ini opsional — kalau nggak dikasih dari
   * parent, stat chat default 0 dan stat like default 0%.
   * Isi dari parent, misal: conversationCount={conversations.length}
   */
  conversationCount?: number;
};

function SquareAvatar({ name, src, size = 112 }: { name: string; src?: string; size?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-500 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.36 }}>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function Section({ label, children, italic }: { label: string; children: string; italic?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 260;
  const isLong = children.length > LIMIT;
  const shown = !isLong || expanded ? children : children.slice(0, LIMIT).trimEnd() + "…";

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 ${
            italic ? "italic opacity-80" : ""
          }`}
        >
          {shown}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-sm font-semibold text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"
          >
            {expanded ? "Read Less" : "Read More"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CharacterProfile({
  persona,
  onBack,
  onEdit,
  onChat,
  onFavorite,
  isFavorite = false,
  onViewUser,
  conversationCount = 0,
}: Props) {
  const [photoPreview, setPhotoPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(isFavorite);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("token"));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!persona.id) return;
    let cancelled = false;
    fetch(`/api/personas/${persona.id}/reactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && data.likes !== undefined) {
          setLikes(data.likes);
          setDislikes(data.dislikes ?? 0);
          setMyReaction(data.my_reaction ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [persona.id, token]);

  async function handleReaction(value: "like" | "dislike") {
    setMyReaction((prev) => (prev === value ? null : value));
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
        setLikes(data.likes);
        setDislikes(data.dislikes ?? 0);
        setMyReaction(data.my_reaction ?? null);
      }
    } catch {
      // ignore
    }
  }

  const likeTotal = likes + dislikes;
  const likePct = likeTotal > 0 ? Math.round((likes / likeTotal) * 100) : 0;

  const tags = (persona.categories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const hasAnyDescription = !!persona.about;

  function handleFavorite() {
    setFavorited((v) => !v);
    onFavorite?.(persona.id);
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="font-semibold text-sm text-zinc-500 dark:text-zinc-400">
          Character Profile
        </span>
      </div>

      {/* Content — kolom di tengah, tapi teks di dalam tetap rata kiri */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {/* Avatar kotak + nama + created by, sejajar horizontal */}
          <div className="flex items-start gap-5">
            <button
              onClick={() => persona.avatar_url && setPhotoPreview(true)}
              className="shrink-0"
            >
              <SquareAvatar name={persona.name} src={persona.avatar_url ?? undefined} size={128} />
            </button>

            <div className="min-w-0 flex-1 pt-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white truncate">
                  {persona.name}
                </h1>
                {onEdit && (
                  <button
                    onClick={() => onEdit(persona)}
                    title="Edit Character"
                    className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              {persona.created_by && (
                <button
                  {...navLink(
                    persona.user_id ? `#/user/${persona.user_id}` : "#/discover",
                    () => {
                      if (persona.user_id) onViewUser?.(persona.user_id);
                    }
                  )}
                  className="text-sm font-medium text-emerald-500 dark:text-emerald-400 mt-0.5 truncate hover:underline"
                >
                  @{persona.created_by}
                </button>
              )}

              {/* Stats bubble: chat interactions & like percentage */}
              <div className="flex items-center gap-4 mt-2.5">
                <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  <MessageSquare size={15} />
                  {conversationCount.toLocaleString()}
                </span>
                <button
                  onClick={() => handleReaction("like")}
                  title="Suka karakter ini"
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    myReaction === "like"
                      ? "text-green-600 dark:text-green-400"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400"
                  }`}
                >
                  <ThumbsUp size={15} />
                  {likePct}%
                </button>
              </div>

              {/* Title / tagline — sekarang di kolom yang sama, di sebelah kanan foto */}
              {persona.title && (
                <p className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200 mt-2.5">
                  {persona.title}
                </p>
              )}
            </div>
          </div>

          {/* Actions: Chat, Favorit, Bagikan — Edit Character sudah ada di samping nama */}
          <div className="flex items-center gap-3 mt-5">
            <button
              {...navLink(`#/chat/${persona.id}`, () => onChat(persona.id))}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <MessageSquare size={16} />
              Start Chatting
            </button>
            <button
              onClick={handleFavorite}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                favorited
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <Heart size={16} fill={favorited ? "currentColor" : "none"} />
              Favorite
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
              {copied ? "Copied" : "Bagikan"}
            </button>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description (About + Personality), lalu Greeting di bawahnya */}
          <div className="mt-8">
            {persona.about && <Section label="About">{persona.about}</Section>}
            {persona.greeting && (
              <Section label="Greeting" italic>
                {persona.greeting}
              </Section>
            )}

            {!hasAnyDescription && !persona.greeting && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">
                No description yet for this character.
              </p>
            )}
          </div>
        </div>
      </div>

      {photoPreview && persona.avatar_url && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setPhotoPreview(false)}
        >
          <img
            src={persona.avatar_url}
            alt={persona.name}
            className="w-64 h-64 rounded-2xl object-cover shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}