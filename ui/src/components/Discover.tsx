import { useMemo, useState } from "react";
import { Compass, Flame, Heart, MessageSquare, Search, Sparkles, ThumbsUp, Users } from "lucide-react";
import AppNavbar from "./AppNavbar";
import Avatar from "./Avatar";
import { navLink } from "../lib/link";
import type { Persona, UserProfile } from "../types";

// Some backends expose an editorial "featured" flag on the persona record.
// Read it defensively so this compiles even if the shared Persona type
// hasn't been extended yet — rename `featured` below if your API uses a
// different field.
type FeaturablePersona = Persona & { featured?: boolean };

type Props = {
  personas: Persona[];
  favorites: Set<string>;
  userProfile: UserProfile | null;
  dark: boolean;
  onToggleDark: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onChat: (id: string) => void;
  onToggleFavorite: (persona: Persona, favorite: boolean) => void;
  onViewUser?: (userId: number | string) => void;
};

const ALL = "Semua";
type Tab = "fyp" | "featured" | "trending";

const TABS: { key: Tab; label: string; icon: typeof Compass }[] = [
  { key: "fyp", label: "For You", icon: Compass },
  { key: "featured", label: "Featured", icon: Sparkles },
  { key: "trending", label: "Trending", icon: Flame },
];

export default function Discover({ personas, favorites, userProfile, dark, onToggleDark, onOpenProfile, onOpenSettings, onLogout, onChat, onToggleFavorite, onViewUser }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [tab, setTab] = useState<Tab>("fyp");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ps of personas) {
      (ps.categories ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    }
    return [ALL, ...Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 10)];
  }, [personas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (personas as FeaturablePersona[]).filter((ps) => {
      const cats = (ps.categories ?? "").split(",").map((c) => c.trim());
      const matchesCategory = category === ALL || cats.includes(category);
      const matchesQuery =
        !q ||
        ps.name.toLowerCase().includes(q) ||
        (ps.title ?? "").toLowerCase().includes(q) ||
        (ps.created_by ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    if (tab === "featured") {
      return base.filter((ps) => ps.featured);
    }
    if (tab === "trending") {
      return [...base].sort((a, b) => {
        const scoreA = (a.likes ?? 0) + (a.dislikes ?? 0);
        const scoreB = (b.likes ?? 0) + (b.dislikes ?? 0);
        return scoreB - scoreA;
      });
    }
    return base;
  }, [personas, search, category, tab]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#FAFAF7] dark:bg-[#0B0D12]">
      <div className="flex-1 overflow-y-auto">
        <AppNavbar
          left={
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1C1B1A] dark:bg-white flex items-center justify-center shrink-0">
                <Compass size={14} className="text-[#FAFAF7] dark:text-[#1A1A18]" strokeWidth={2.5} />
              </div>
            </div>
          }
          center={
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5B0A2] dark:text-[#565B68] pointer-events-none" />
              <input
                className="w-full rounded-full border border-[#E7E3D9] dark:border-[#23262F] bg-white dark:bg-[#14171E] pl-9 pr-3.5 py-1.5 text-sm text-[#1A1A18] dark:text-[#F0EEE8] placeholder:text-[#B5B0A2] dark:placeholder:text-[#565B68] focus:outline-none focus:border-[#E8611F] transition-colors"
                placeholder="Dive into your new own reality..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          }
          wideCenter
          userProfile={userProfile}
          dark={dark}
          onToggleDark={onToggleDark}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />

        <div className="px-4 pt-3">
          <div className="flex gap-4 border-b border-[#E7E3D9] dark:border-[#23262F]">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 pb-2.5 -mb-px text-sm border-b-2 transition-colors ${
                  tab === key
                    ? "border-[#E8611F] text-[#1A1A18] dark:text-[#F0EEE8] font-medium"
                    : "border-transparent text-[#8A8578] dark:text-[#8B90A0] hover:text-[#1A1A18] dark:hover:text-[#F0EEE8]"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  category === c
                    ? "bg-[#E8611F] border-[#E8611F] text-white"
                    : "border-[#E7E3D9] dark:border-[#23262F] text-[#8A8578] dark:text-[#8B90A0] hover:border-[#E8611F]/50 hover:text-[#1A1A18] dark:hover:text-[#F0EEE8]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center mt-14 gap-2">
              <Users size={28} className="text-[#D8D3C6] dark:text-[#2A2E38]" />
              <p className="text-sm text-[#8A8578] dark:text-[#8B90A0]">
                {search
                  ? `Tidak ada karakter untuk "${search}"`
                  : tab === "featured"
                  ? "Belum ada karakter unggulan di kategori ini"
                  : "Belum ada karakter di kategori ini"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((ps) => {
              const fav = favorites.has(ps.id);
              const likes = ps.likes ?? 0;
              const dislikes = ps.dislikes ?? 0;
              const total = likes + dislikes;
              const likePct = total > 0 ? Math.round((likes / total) * 100) : 0;
              const cats = (ps.categories ?? "")
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
                .slice(0, 2);
              return (
                <div
                  key={ps.id}
                  {...navLink(`#/chat/${ps.id}`, () => onChat(ps.id))}
                  role="button"
                  tabIndex={0}
                  title="Buka chat karakter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (e.ctrlKey || e.metaKey)
                        window.open(`#/chat/${ps.id}`, "_blank", "noopener,noreferrer");
                      else onChat(ps.id);
                    }
                  }}
                  className="group relative text-left rounded-xl overflow-hidden bg-[#14171E] aspect-[3/4] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {ps.avatar_url ? (
                    <img
                      src={ps.avatar_url}
                      alt={ps.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2A2E38] to-[#14171E]">
                      <Avatar name={ps.name} size={56} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(ps, !fav);
                    }}
                    onAuxClick={(e) => {
                      e.stopPropagation();
                      if (e.button === 1) onToggleFavorite(ps, !fav);
                    }}
                    title={fav ? "Hapus dari tersimpan" : "Simpan"}
                    className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all active:scale-90 ${
                      fav ? "text-rose-500 bg-black/40" : "text-white/90 bg-black/30 hover:text-rose-400"
                    }`}
                  >
                    <Heart size={14} fill={fav ? "currentColor" : "none"} />
                  </button>

                  {total > 0 && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/90">
                      <ThumbsUp size={10} />
                      {likePct}%
                    </span>
                  )}

                  <div className="absolute bottom-0 inset-x-0 p-2.5">
                    {cats.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {cats.map((cat) => (
                          <span key={cat} className="text-[10px] font-medium text-white/70">
                            {cat}
                            {cat !== cats[cats.length - 1] ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="font-semibold text-sm text-white truncate">{ps.name}</p>
                    {ps.title && (
                      <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{ps.title}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      {ps.created_by ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.ctrlKey || e.metaKey) {
                              if (ps.user_id)
                                window.open(`#/user/${ps.user_id}`, "_blank", "noopener,noreferrer");
                            } else if (ps.user_id) {
                              onViewUser?.(ps.user_id);
                            }
                          }}
                          onAuxClick={(e) => {
                            e.stopPropagation();
                            if (e.button === 1 && ps.user_id)
                              window.open(`#/user/${ps.user_id}`, "_blank", "noopener,noreferrer");
                          }}
                          className="text-xs text-white/60 hover:text-white truncate"
                        >
                          @{ps.created_by}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex items-center gap-1 text-xs text-white/60">
                        <MessageSquare size={11} />
                        Chat
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}