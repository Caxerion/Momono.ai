# ToDo — Dukungan Model AI (Tier 1 & Tier 2)

Status backend multi-engine: **sebagian done** (config + `/api/models` + `/api/chat` menerima `tier`).
Belum ada integrasi UI.

---

## Tier 1 (Normal / intimate ringan) — FOKUS SEKARANG

Engine aktif (via Groq): `openai/gpt-oss-120b`.
Alternatif: OpenRouter `deepseek/deepseek-chat` (murah, konteks panjang) atau `anthropic/claude-3.5-sonnet` (kualitas).

- [ ] Integrasi UI: toggle/pemilihan tier di halaman chat (default `tier1`)
- [ ] Kirim field `tier` di request `/api/chat` dari frontend (`ui/src/App.tsx` `send()`)
- [ ] Test streaming end-to-end lewat `/api/models` dan `/api/chat` (tier1)
- [ ] Tambah `chat model` (gaya respond) — eksplorasi nanti: tiap chat model = bundle system prompt
- [ ] Fallback: kalau engine tier1 gagal, tampilkan error yang jelas / retry

## Tier 2 (Hard NSFW / uncensored) — MENUNGGU

Engine lokal (Ollama, base Mistral Nemo 12B uncensored):
`d89ftekb7/mistral-nemo-uncensored:12b-q4_0` (~7.1GB).
Alternatif: `ocharlee` / `midnight-miqu` (lebih halus, butuh pull sendiri).

- [ ] `ollama pull d89ftekb7/mistral-nemo-uncensored:12b-q4_0` (volume besar, ~7.1GB)
- [ ] Verify Ollama OpenAI-compatible berjalan: `curl http://127.0.0.1:11434/v1/chat/completions`
- [ ] Testing `/api/chat` dengan `tier=tier2`
- [ ] Field `age` (18+) + `nsfw` flag di tabel `personas`
- [ ] Validasi server-side: `nsfw=true` wajib `age >= 18`; `age < 18` → `nsfw=false` (reject kalau aneh)
- [ ] Blokir teks indikasi minor digabung flag `nsfw`
- [ ] Suntikkan usia 18+ ke system prompt character
- [ ] Gating server-side: Tier 2 aktif = user premium + toggle NSFW on + persona `nsfw=true` + `age>=18`
- [ ] Toggle NSFW mode di UI (hanya muncal untuk user premium)
- [ ] Jangan bocorkan API key/config tier2 ke frontend
- [ ] Nilai tambah: filter/review admin untuk karakter NSFW mencurigakan

## Desain

- Lapisan "chat model" (style/persona) terpisah dari engine tier — jangan dicampur
  (model chat = system prompt bundle, engine = tier).
- Engine dipilih di awal request, tidak switching di tengah stream.
- Jika engine tier2 unavailable → degrade otomatis ke tier1.