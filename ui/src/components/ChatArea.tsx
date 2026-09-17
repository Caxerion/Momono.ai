import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, Plus, Send, Sparkles } from "lucide-react";
import AppNavbar from "./AppNavbar";
import Avatar from "./Avatar";
import type { Message, Persona, UserProfile } from "../types";
import { navLink } from "../lib/link";

function renderText(text: string) {
  if (!text) return null;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = escaped.replace(/\*([^*]+)\*/g, '<em class="italic opacity-80">$1</em>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

type Bubble =
  | { type: "user"; msg: Message }
  | { type: "assistant"; msg: Message }
  | { type: "group"; userMsg: Message; responses: Message[] };

function buildBubbles(messages: Message[]): Bubble[] {
  const bubbles: Bubble[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "user") {
      const userMsg = m;
      const responses: Message[] = [];
      i++;
      while (i < messages.length && messages[i].role === "assistant") {
        responses.push(messages[i]);
        i++;
      }
      if (responses.length > 0) {
        bubbles.push({ type: "group", userMsg, responses });
      } else {
        bubbles.push({ type: "user", msg: userMsg });
      }
    } else {
      bubbles.push({ type: "assistant", msg: m });
      i++;
    }
  }
  return bubbles;
}

type Props = {
  persona: Persona | null;
  messages: Message[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  onRegenerate: () => void;
  regenView: Record<number, number>;
  onPrevRegen: (groupIdx: number) => void;
  onNextRegen: (groupIdx: number, max: number) => void;
  busy: boolean;
  userProfile?: UserProfile | null;
  onViewUser?: (userId: number | string) => void;
  onBack: () => void;
  onOpenMenu?: () => void;
  onOpenProfile: () => void;
  onOpenPersonaProfile: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  dark: boolean;
  onToggleDark: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
};

// Lebar maksimum kolom percakapan — dipakai bareng buat area pesan & form input
// biar keduanya tetap sejajar dan konten nggak mepet ke tepi kanan/kiri,
// baik pas sidebar terbuka maupun tertutup.
const CHAT_COLUMN_CLASS = "max-w-3xl mx-auto w-full";

export default function ChatArea(p: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [photoPreview, setPhotoPreview] = useState(false);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [p.messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [p.input]);

  const bubbles = buildBubbles(p.messages);
  const lastGroupIdx = bubbles.length - 1;
  const lastBubble = bubbles[lastGroupIdx];
  const isLastGroupComplete =
    lastBubble?.type === "group" &&
    lastBubble.responses.length > 0 &&
    lastBubble.responses[lastBubble.responses.length - 1].content !== "";

  return (
    <main className="relative flex-1 flex flex-col bg-white dark:bg-zinc-950 min-h-0">
      <div className="flex-1 overflow-y-auto">
        <AppNavbar
          onOpenMenu={p.onOpenMenu}
          left={
            p.persona ? (
              <button
                onClick={p.onBack}
                title="Back"
                className="flex items-center justify-center -ml-1 p-2 -my-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Momono.ai
                </span>
              </div>
            )
          }
          center={
            p.persona ? (
              <button
                {...navLink(`#/profile/${p.persona.id}`, p.onOpenPersonaProfile)}
                title="Lihat profil karakter"
                className="flex items-center gap-2 max-w-full"
              >
                <div className="relative shrink-0">
                  <Avatar name={p.persona.name} size={28} src={p.persona.avatar_url} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
                </div>
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] hover:underline underline-offset-4">
                  {p.persona.name}
                </span>
              </button>
            ) : (
              <span className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 truncate">
                Mulai chat dengan karakter
              </span>
            )
          }
          right={null}
          userProfile={p.userProfile ?? null}
          dark={p.dark}
          onToggleDark={p.onToggleDark}
          onOpenProfile={p.onOpenProfile}
          onOpenSettings={p.onOpenSettings}
          onLogout={p.onLogout}
        />

        {p.persona && (
          <button
            onClick={p.onToggleSidebar}
            title={p.sidebarOpen ? "Sembunyikan panel karakter" : "Buka panel karakter"}
            className={`absolute top-24 md:top-[68px] right-3 z-20 flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              p.sidebarOpen
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40"
                : "text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        )}

        <div className={`${CHAT_COLUMN_CLASS} p-4 space-y-4`}>
          {p.messages.length === 0 && (
            <div className="text-center text-zinc-400 mt-10 px-4">
              Mulai chatting with your character...
            </div>
          )}

          {p.persona && p.persona.greeting && (
            <div className="flex flex-col items-center gap-2 pt-4 pb-2">
              <button
                className="rounded-full"
                onClick={() => p.persona?.avatar_url && setPhotoPreview(true)}
              >
                <Avatar name={p.persona.name} size={64} src={p.persona.avatar_url} />
              </button>
              <span className="font-bold text-lg">{p.persona.name}</span>
              {p.persona.title && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{p.persona.title}</span>
              )}
              <span className="text-xs text-zinc-400">
                Created by{" "}
                {p.persona?.user_id ? (
                  <button
                    {...navLink(
                      `#/user/${p.persona.user_id}`,
                      () => p.persona?.user_id && p.onViewUser?.(p.persona.user_id)
                    )}
                    className="text-emerald-500 dark:text-emerald-400 hover:underline"
                  >
                    @{p.persona.created_by || "Unknown"}
                  </button>
                ) : (
                  `@${p.persona.created_by || p.userProfile?.username || "Unknown"}`
                )}
              </span>
            </div>
          )}

          {bubbles.map((b, bi) => {
            if (b.type === "user") {
              return (
                <div key={`u-${bi}`} className="flex gap-3 flex-row-reverse">
                  <Avatar name="You" emoji="🙂" size={36} />
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 whitespace-pre-wrap bg-emerald-600 text-white">
                    {renderText(b.msg.content)}
                  </div>
                </div>
              );
            }

            if (b.type === "assistant") {
              return (
                <div key={`a-${bi}`} className="flex gap-3">
                  <Avatar name={p.persona?.name ?? "AI"} size={36} src={p.persona?.avatar_url} />
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 whitespace-pre-wrap bg-zinc-100 dark:bg-zinc-800">
                    {renderText(b.msg.content)}
                  </div>
                </div>
              );
            }

            const total = b.responses.length;
            const viewing = p.regenView[bi] ?? (total - 1);
            const safeViewing = Math.min(viewing, total - 1);
            const current = b.responses[safeViewing];
            const isLast = bi === lastGroupIdx;
            const showRegenBar = isLast && !p.busy && total > 0 && current.content !== "";

            return (
              <div key={`g-${bi}`}>
                <div className="flex gap-3 flex-row-reverse mb-3">
                  <Avatar name="You" emoji="🙂" size={36} />
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 whitespace-pre-wrap bg-emerald-600 text-white">
                    {renderText(b.userMsg.content)}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Avatar name={p.persona?.name ?? "AI"} size={36} src={p.persona?.avatar_url} />
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 whitespace-pre-wrap bg-zinc-100 dark:bg-zinc-800">
                    {current.content ? (
                      renderText(current.content)
                    ) : p.busy && isLast ? (
                      <LoadingDots />
                    ) : null}
                  </div>
                </div>

                {showRegenBar && (
                  <div className="flex items-center gap-1 mt-1 ml-12">
                    {total > 1 && (
                      <>
                        <button
                          onClick={() => p.onPrevRegen(bi)}
                          disabled={safeViewing === 0}
                          className="text-xs px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ‹
                        </button>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {safeViewing + 1}/{total}
                        </span>
                        <button
                          onClick={() => p.onNextRegen(bi, total - 1)}
                          disabled={safeViewing === total - 1}
                          className="text-xs px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ›
                        </button>
                      </>
                    )}
                    <button
                      onClick={p.onRegenerate}
                      disabled={total >= 25}
                      className="text-xs px-2 py-0.5 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      🔄 {total}/25
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
        onSubmit={(e) => {
          e.preventDefault();
          p.onSend();
        }}
      >
        <div className={`${CHAT_COLUMN_CLASS} p-3 flex items-center gap-2`}>
          <button
            type="button"
            title="Add attachment"
            className="shrink-0 w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <Plus size={20} />
          </button>

          <textarea
            ref={inputRef}
            className="flex-1 resize-none overflow-y-auto rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-5 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-shadow leading-tight"
            rows={1}
            value={p.input}
            placeholder="Type Anything..."
            onChange={(e) => p.setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                p.onSend();
              }
            }}
          />

          <button
            type="submit"
            title="Send"
            disabled={p.busy || !p.input.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </div>
      </form>

      {photoPreview && p.persona?.avatar_url && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setPhotoPreview(false)}
        >
          <img
            src={p.persona.avatar_url}
            alt={p.persona.name}
            className="w-64 h-64 rounded-full object-cover shadow-2xl"
          />
        </div>
      )}
    </main>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-5">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}