import { useState } from "react";
import type { Persona } from "../types";

type Props = {
  persona: Persona | null;
  token: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PersonaModal({ persona, token, onClose, onSaved }: Props) {
  const [name, setName] = useState(persona?.name ?? "");
  const [about, setAbout] = useState(persona?.about ?? "");
  const [greeting, setGreeting] = useState(persona?.greeting ?? "");
  const [personality, setPersonality] = useState(persona?.personality ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const body = JSON.stringify({ name, about, greeting, personality });
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (persona) {
      await fetch(`/api/personas/${persona.id}`, {
        method: "PUT",
        headers,
        body,
      });
    } else {
      await fetch("/api/personas", {
        method: "POST",
        headers,
        body,
      });
    }
    setBusy(false);
    onSaved();
    onClose();
  }

  async function remove() {
    if (!persona) return;
    await fetch(`/api/personas/${persona.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-800 rounded-xl p-5 w-96 max-h-[90vh] overflow-y-auto text-black dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-3">
          {persona ? "Edit Karakter" : "Buat Karakter"}
        </h2>
        <label className="block text-sm mb-1">Nama</label>
        <input
          className="w-full mb-3 rounded border p-2 bg-zinc-100 dark:bg-zinc-700"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block text-sm mb-1">About (deskripsi karakter)</label>
        <textarea
          className="w-full mb-3 rounded border p-2 bg-zinc-100 dark:bg-zinc-700"
          rows={6}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Contoh: Seorang gadis SMA yang pemalu tapi care. Suka baca novel. Kalau malu, pipinya merah dan suka ngomong pelan."
        />
        <label className="block text-sm mb-1">Greeting (pesan pembuka, opsional)</label>
        <textarea
          className="w-full mb-3 rounded border p-2 bg-zinc-100 dark:bg-zinc-700"
          rows={2}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="*dia melambaikan tangan* Hei, kamu juga disini?"
        />
        <label className="block text-sm mb-1">Character's Personality</label>
        <textarea
          className="w-full mb-3 rounded border p-2 bg-zinc-100 dark:bg-zinc-700 resize-y"
          rows={8}
          maxLength={10000}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          placeholder="Jelaskan kepribadian karakter secara detail: sifat, kebiasaan, cara bicara, nilai-nilai, motivasi, ketakutan, dll."
        />
        <p className="text-xs text-zinc-400 -mt-2 mb-3">{personality.length}/10000 karakter</p>
        <div className="flex justify-between items-center">
          {persona ? (
            <button className="text-red-500 text-sm" onClick={remove}>
              Hapus
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded bg-zinc-300 dark:bg-zinc-600"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
              disabled={busy || !name}
              onClick={save}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
