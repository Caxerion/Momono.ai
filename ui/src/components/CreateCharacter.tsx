import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ArrowLeft } from "lucide-react";
import Avatar from "./Avatar";
import type { Category, Persona } from "../types";

type Props = {
  persona: Persona | null;
  token: string | null;
  createdBy: string;
  onBack: () => void;
  onSaved: () => void;
};

const FIELD =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-shadow";
const LABEL =
  "block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5";

export default function CreateCharacter({ persona, token, createdBy, onBack, onSaved }: Props) {
  const [name, setName] = useState(persona?.name ?? "");
  const [title, setTitle] = useState(persona?.title ?? "");
  const [about, setAbout] = useState(persona?.about ?? "");
  const [greeting, setGreeting] = useState(persona?.greeting ?? "");
  const [personality, setPersonality] = useState(persona?.personality ?? "");
  const [avatarUrl, setAvatarUrl] = useState(persona?.avatar_url ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    persona?.categories ? persona.categories.split(",").map((c) => c.trim()).filter(Boolean) : []
  );
  const [catOpen, setCatOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catOpen) return;
    function onDown(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCatOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [catOpen]);

  useEffect(() => {
    fetch("/api/categories", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, [token]);

  function toggleCategory(name: string) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  async function uploadAvatar(pid: string, file: File) {
    const form = new FormData();
    form.append("avatar", file);
    const r = await fetch(`/api/personas/${pid}/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (r.ok) {
      const d = await r.json();
      setAvatarUrl(d.avatar_url);
    }
  }

  async function removeAvatar() {
    if (!persona) {
      setAvatarUrl("");
      setAvatarFile(null);
      return;
    }
    const r = await fetch(`/api/personas/${persona.id}/avatar`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (r.ok) {
      setAvatarUrl("");
      setAvatarFile(null);
    }
  }

  async function save() {
    setBusy(true);
    const categories = selectedCategories.join(",");
    const body = JSON.stringify({ name, title, about, greeting, personality, categories, created_by: persona ? undefined : createdBy });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (persona) {
      await fetch(`/api/personas/${persona.id}`, {
        method: "PUT",
        headers,
        body,
      });
      if (avatarFile) {
        await uploadAvatar(persona.id, avatarFile);
      }
    } else {
      const r = await fetch("/api/personas", {
        method: "POST",
        headers,
        body,
      });
      const d = await r.json();
      if (d.id && avatarFile) {
        await uploadAvatar(d.id, avatarFile);
      }
    }
    setBusy(false);
    onSaved();
    onBack();
  }

  async function remove() {
    if (!persona) return;
    await fetch(`/api/personas/${persona.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    onSaved();
    onBack();
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          title="Back"
          aria-label="Back"
          className="flex items-center justify-center -ml-1 p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {persona ? "Edit Character" : "Create New Character"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <button
              className="relative group rounded-full overflow-hidden"
              onClick={() => fileRef.current?.click()}
            >
              <Avatar name={name || "?"} src={avatarUrl} size={96} />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </button>
            {avatarUrl && (
              <button
                onClick={removeAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                title="Remove photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
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
              if (file) {
                setAvatarFile(file);
                setAvatarUrl(URL.createObjectURL(file));
              }
              e.target.value = "";
            }}
          />
          <p className="text-xs text-zinc-400 mt-2">Click to upload photo</p>
        </div>

        <label className={LABEL}>Name</label>
        <input
          className={`${FIELD} mb-4`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name..."
        />

        <label className={LABEL}>Title (short description)</label>
        <input
          className={`${FIELD} mb-4`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. A shy girl who loves reading novels"
        />

        <label className={LABEL}>Categories</label>
        <div className="mb-4 relative" ref={catRef}>
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className={`${FIELD} flex items-center justify-between gap-2 text-left`}
          >
            {selectedCategories.length === 0 ? (
              <span className="text-zinc-400">Select categories...</span>
            ) : (
              <span className="flex flex-wrap gap-1.5 min-w-0">
                {selectedCategories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2 py-0.5 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`shrink-0 text-zinc-400 transition-transform ${catOpen ? "rotate-180" : ""}`}
            />
          </button>
          {catOpen && (
            <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg py-1">
              {categories.length === 0 && (
                <p className="px-3 py-2 text-sm text-zinc-400">No categories available</p>
              )}
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700/70 transition-colors"
                  >
                    <span
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                        active
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <label className={LABEL}>About (character description)</label>
        <p className="text-xs text-zinc-400 mb-2">
          You can also use <code className="text-emerald-500 dark:text-emerald-400">{"{user}"}</code> to refer the user's display name.
        </p>
        <textarea
          className={`${FIELD} mb-4 resize-y`}
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="e.g. A shy high school girl who is caring. Loves reading novels. When embarrassed, her cheeks turn red and she speaks softly."
        />

        <label className={LABEL}>Greeting (opening message, optional)</label>
        <textarea
          className={`${FIELD} mb-2 resize-y`}
          rows={3}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="*she waves her hand* Hey, you're here too?"
        />
        <p className="text-xs text-zinc-400 mb-4">
          Pakai <code className="text-emerald-500 dark:text-emerald-400">{"{user}"}</code> untuk manggil nama pemain, contoh: "Hi {"{user}"}"
        </p>

        <label className={LABEL}>Character's Personality</label>
        <textarea
          className={`${FIELD} mb-2 resize-y`}
          rows={10}
          maxLength={10000}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          placeholder="Describe the character's personality in detail: traits, habits, speech style, values, motivations, fears, etc."
        />
        <p className="text-xs text-zinc-400 mb-6">{personality.length}/10000 characters</p>

        <div className="flex flex-wrap justify-between items-center gap-3 pb-6">
          {persona ? (
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              onClick={remove}
            >
              Delete Character
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              disabled={busy || !name}
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
