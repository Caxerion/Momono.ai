import { useRef, useState } from "react";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

type Props = {
  profile: UserProfile;
  token: string | null;
  onBack: () => void;
  onSaved: (updated: UserProfile) => void;
};

export default function Settings({ profile, token, onBack, onSaved }: Props) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [aboutMe, setAboutMe] = useState(profile.about_me);
  const [gender, setGender] = useState(profile.gender ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
      body: JSON.stringify({ username, display_name: displayName, about_me: aboutMe, gender }),
    });
    if (r.ok) {
      setSaved(true);
      onSaved({ ...profile, username, display_name: displayName, about_me: aboutMe, avatar_url: avatarUrl, gender });
      setTimeout(() => setSaved(false), 2000);
    } else {
      const text = await r.text();
      setError(text || "Failed to save");
    }
    setBusy(false);
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
        <span className="font-semibold text-sm">Profile Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
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
          placeholder="Display name you want to show..."
        />

        <label className="block text-sm font-medium mb-1">About Me</label>
        <textarea
          className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800 resize-y"
          rows={6}
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Tell about yourself..."
        />

        <label className="block text-sm font-medium mb-1">Gender</label>
        <input
          className="w-full mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-100 dark:bg-zinc-800"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          placeholder="Male, Female, or other..."
        />

        <div className="flex items-center gap-3 pb-6">
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            onClick={onBack}
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
          {error && (
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
