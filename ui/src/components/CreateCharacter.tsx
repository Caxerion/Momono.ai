import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import type { Category, Persona } from "../types";

type Props = {
  persona: Persona | null;
  token: string | null;
  createdBy: string;
  onBack: () => void;
  onSaved: () => void;
};

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
  const fileRef = useRef<HTMLInputElement>(null);

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
      <div className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Back
        </button>
        <span className="font-semibold text-sm">
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

        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name..."
        />

        <label className="block text-sm font-medium mb-1">Title (short description)</label>
        <input
          className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. A shy girl who loves reading novels"
        />

        <label className="block text-sm font-medium mb-1">Categories</label>
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          {selectedCategories.length === 0 && (
            <p className="text-xs text-zinc-400 mt-1.5">Select one or more categories</p>
          )}
        </div>

        <label className="block text-sm font-medium mb-1">About (character description)</label>
        <p className="text-xs text-zinc-400 mb-2">
          Bisa juga pakai <code className="text-emerald-500 dark:text-emerald-400">{"{user}"}</code> untuk merujuk nama pemain.
        </p>
        <textarea
          className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800 resize-y"
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="e.g. A shy high school girl who is caring. Loves reading novels. When embarrassed, her cheeks turn red and she speaks softly."
        />

        <label className="block text-sm font-medium mb-1">Greeting (opening message, optional)</label>
        <textarea
          className="w-full mb-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800 resize-y"
          rows={3}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="*she waves her hand* Hey, you're here too?"
        />
        <p className="text-xs text-zinc-400 mb-4">
          Pakai <code className="text-emerald-500 dark:text-emerald-400">{"{user}"}</code> untuk manggil nama pemain, contoh: "Hi {"{user}"}"
        </p>

        <label className="block text-sm font-medium mb-1">Character's Personality</label>
        <textarea
          className="w-full mb-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800 resize-y"
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
              className="px-4 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
              onClick={remove}
            >
              Delete Character
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
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
