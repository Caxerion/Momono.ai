import { useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  Download,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

type GenModel = {
  key: string;
  label: string;
  type: "image" | "video";
};

type GenResult = {
  url: string;
  type: "image" | "video";
  model: string;
  prompt: string;
};

type Props = {
  token: string | null;
};

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Generate({ token }: Props) {
  const [type, setType] = useState<"image" | "video">("image");
  const [models, setModels] = useState<GenModel[]>([]);
  const [model, setModel] = useState("dalle3");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenResult[]>([]);
  const [preview, setPreview] = useState<GenResult | null>(null);

  useEffect(() => {
    fetch("/api/generate/models", { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((data) => {
        const list: GenModel[] = Object.entries(data).map(([key, val]) => ({
          key,
          label: (val as { type: string; label: string }).label,
          type: (val as { type: string }).type as "image" | "video",
        }));
        setModels(list);
        const img = list.find((m) => m.type === "image");
        if (img) setModel(img.key);
      })
      .catch(() => {});
  }, [token]);

  const typeModels = useMemo(
    () => models.filter((m) => m.type === type),
    [models, type]
  );

  useEffect(() => {
    if (typeModels.length > 0 && !typeModels.some((m) => m.key === model)) {
      setModel(typeModels[0].key);
    }
  }, [typeModels, model]);

  async function handleGenerate() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ prompt: text, model }),
      });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResults((prev) => [
        { url: data.url, type: data.type, model, prompt: text },
        ...prev,
      ]);
      setPrompt("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setBusy(false);
    }
  }

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      <header className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Generate
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Buat gambar &amp; video dari teks menggunakan AI
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        {/* Type tabs */}
        <div className="flex gap-1.5 mb-3 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
          <button
            onClick={() => setType("image")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              type === "image"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <ImageIcon size={15} />
            Image
          </button>
          <button
            onClick={() => setType("video")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              type === "video"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <Clapperboard size={15} />
            Video
          </button>
        </div>

        {/* Model selector */}
        <div className="mb-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">
            Model
          </label>
          <div className="flex flex-wrap gap-1.5">
            {typeModels.map((m) => (
              <button
                key={m.key}
                onClick={() => setModel(m.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors focus:outline-none ${
                  model === m.key
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-indigo-400/50"
                }`}
              >
                <Sparkles size={13} />
                {m.label}
              </button>
            ))}
            {typeModels.length === 0 && (
              <p className="text-sm text-zinc-400">Model tidak tersedia</p>
            )}
          </div>
        </div>

        {/* Prompt input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={
              type === "image"
                ? "Deskripsikan gambar yang mau kamu buat..."
                : "Deskripsikan video yang mau kamu buat..."
            }
            rows={3}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 pr-12 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition-shadow resize-none"
          />
          {prompt.trim() && (
            <button
              onClick={() => setPrompt("")}
              className="absolute right-3 top-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={busy || !prompt.trim()}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white text-sm font-semibold px-4 py-2.5 hover:from-indigo-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generate
            </>
          )}
        </button>
        <p className="mt-1.5 text-[11px] text-zinc-400 text-center">
          {type === "image"
            ? "Ctrl/Cmd + Enter untuk generate"
            : "Video butuh waktu lebih lama (hingga beberapa menit)"}
        </p>

        {error && (
          <p className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="mt-6 mb-2">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Results
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((res, i) => (
                <div
                  key={`${res.url}-${i}`}
                  className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                >
                  {res.type === "image" ? (
                    <img
                      src={res.url}
                      alt={res.prompt}
                      onClick={() => setPreview(res)}
                      className="w-full aspect-square object-cover cursor-zoom-in"
                    />
                  ) : (
                    <video
                      src={res.url}
                      onClick={() => setPreview(res)}
                      className="w-full aspect-square object-cover cursor-zoom-in"
                      muted
                      loop
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                    <button
                      onClick={() => setPreview(res)}
                      className="p-2 rounded-lg bg-white/90 text-zinc-900 hover:bg-white"
                    >
                      <Maximize2 size={15} />
                    </button>
                    <button
                      onClick={() => download(res.url)}
                      className="p-2 rounded-lg bg-white/90 text-zinc-900 hover:bg-white"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white truncate">{res.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-[90vw] max-h-[90vh] relative">
            {preview.type === "image" ? (
              <img
                src={preview.url}
                alt={preview.prompt}
                className="max-w-full max-h-[90vh] rounded-2xl object-contain"
              />
            ) : (
              <video
                src={preview.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-2xl"
              />
            )}
            <button
              onClick={() => download(preview.url)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-white/90 text-zinc-900 px-3 py-1.5 text-sm font-medium hover:bg-white"
            >
              <Download size={15} />
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}