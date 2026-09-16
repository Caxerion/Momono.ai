import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  ExternalLink,
  FileWarning,
  Hash,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Save,
  Shield,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
} from "lucide-react";
import { navLink } from "../lib/link";

type Props = {
  token: string | null;
  tab: Tab;
  onChangeTab: (tab: Tab) => void;
  onBack: () => void;
  onViewUser: (userId: string) => void;
  onViewPersona?: (personaId: string) => void;
};

type Stats = {
  users: number;
  personas: number;
  conversations: number;
  messages: number;
  reports: number;
  trend: { date: string; label: string; users: number; messages: number; conversations: number }[];
  categories: { cat: string; n: number }[];
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  created_at: string;
  is_admin: boolean;
  personas: number;
  conversations: number;
};

type AdminPersona = {
  id: string;
  name: string;
  title: string;
  categories: string;
  created_by: string;
  user_id: string;
  created_at: string;
  likes: number;
  dislikes: number;
  conversations: number;
};

type AdminReport = {
  reporter_id: string;
  reporter_name: string;
  reported_id: string;
  reported_name: string;
  target_type?: string;
  reason: string;
  created_at: string;
};

type AdminConversation = {
  id: string;
  title: string;
  persona_id: string;
  persona_name: string;
  user_id: string;
  updated_at: string;
};

type AdminChatModel = {
  key: string;
  label: string;
  description: string;
  prompt_tier1: string;
  prompt_tier2: string;
  sort_order: number;
};

export type Tab =
  | "dashboard"
  | "users"
  | "personas"
  | "reports"
  | "conversations"
  | "chat-models";

export type { Tab as AdminTab };

async function getJSON<T>(url: string, token: string | null, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function Admin({ token, tab, onChangeTab, onBack, onViewUser, onViewPersona }: Props) {
  const setTab = onChangeTab;
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [personas, setPersonas] = useState<AdminPersona[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [chatModels, setChatModels] = useState<AdminChatModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (tab === "dashboard") {
      const s = await getJSON<Stats>("/api/admin/stats", token);
      if (s) setStats(s);
      else setError("Gagal memuat statistik (pastikan kamu login sebagai admin).");
    } else if (tab === "users") {
      const u = await getJSON<AdminUser[]>("/api/admin/users", token);
      if (u) setUsers(u);
      else setError("Gagal memuat daftar user.");
    } else if (tab === "personas") {
      const p = await getJSON<AdminPersona[]>("/api/admin/personas", token);
      if (p) setPersonas(p);
      else setError("Gagal memuat daftar karakter.");
    } else if (tab === "reports") {
      const r = await getJSON<AdminReport[]>("/api/admin/reports", token);
      if (r) setReports(r);
      else setError("Gagal memuat laporan.");
    } else if (tab === "conversations") {
      const c = await getJSON<AdminConversation[]>("/api/admin/conversations", token);
      if (c) setConversations(c);
      else setError("Gagal memuat percakapan.");
    } else if (tab === "chat-models") {
      const m = await getJSON<AdminChatModel[]>("/api/admin/chat-models", token);
      if (m) setChatModels(m);
      else setError("Gagal memuat chat models.");
    }
    setLoading(false);
  }, [tab, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function deletePersona(id: string) {
    if (!window.confirm("Hapus karakter ini beserta semua percakapannya?")) return;
    setBusyId(id);
    await getJSON<{ ok: boolean }>(`/api/admin/personas/${id}`, token, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  async function deleteUser(id: number) {
    if (!window.confirm("Hapus user ini beserta seluruh datanya (karakter, chat, follow, laporan)?")) return;
    setBusyId(String(id));
    await getJSON<{ ok: boolean }>(`/api/admin/users/${id}`, token, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  async function resolveReport(reporterId: string, reportedId: string) {
    await getJSON<{ ok: boolean }>(
      `/api/admin/reports/${reporterId}/${reportedId}`,
      token,
      { method: "DELETE" }
    );
    load();
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { key: "users", label: "Users", icon: <Users size={16} /> },
    { key: "personas", label: "Personas", icon: <BarChart3 size={16} /> },
    { key: "reports", label: "Reports", icon: <FileWarning size={16} /> },
    { key: "conversations", label: "Conversations", icon: <MessagesSquare size={16} /> },
    { key: "chat-models", label: "Chat Models", icon: <Bot size={16} /> },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      {/* Header */}
      {/* <header className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none"
          title="Kembali ke sisi user"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              Admin Panel
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Kelola user, karakter, dan laporan
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:inline text-xs text-zinc-400">
          Halaman admin terpisah dari halaman user
        </span>
      </header> */}

      {/* Tabs */}
      <nav className="flex gap-1.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
              tab === t.key
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400 px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            Memuat...
          </div>
        ) : tab === "dashboard" ? (
          <Dashboard stats={stats} />
        ) : tab === "users" ? (
          <UsersTable users={users} busyId={busyId} onDelete={deleteUser} onViewUser={onViewUser} />
        ) : tab === "personas" ? (
          <PersonasTable personas={personas} busyId={busyId} onDelete={deletePersona} onViewUser={onViewUser} />
        ) : tab === "reports" ? (
          <ReportsTable reports={reports} busyId={busyId} onResolve={resolveReport} onViewUser={onViewUser} onViewPersona={onViewPersona} />
        ) : tab === "chat-models" ? (
          <ChatModelsEditor models={chatModels} token={token} onSaved={load} />
        ) : (
          <ConversationsTable conversations={conversations} onViewUser={onViewUser} />
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  sub,
  icon,
  children,
}: {
  title: string;
  sub?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-emerald-500">{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
        {sub && <span className="ml-auto text-[11px] text-zinc-400">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function trendDelta(series: number[]): number | null {
  const recent = series.slice(-2).reduce((a, b) => a + b, 0);
  const prev = series.slice(-4, -2).reduce((a, b) => a + b, 0);
  if (prev <= 0) return null;
  return Math.round(((recent - prev) / prev) * 100);
}

function BarTrend({ data }: { data: Stats["trend"] }) {
  const max = Math.max(...data.map((d) => d.messages), 0);
  const totalMsgs = data.reduce((s, d) => s + d.messages, 0);
  const totalChats = data.reduce((s, d) => s + d.conversations, 0);
  const totalUsers = data.reduce((s, d) => s + d.users, 0);
  const gridLevels = [25, 50, 75];
  return (
    <div className="mt-4">
      <div className="relative flex items-end justify-between gap-2 h-40">
        {gridLevels.map((g) => (
          <div
            key={g}
            className="absolute inset-x-0 border-t border-dashed border-zinc-200 dark:border-zinc-800"
            style={{ bottom: `${g}%` }}
          />
        ))}
        {data.map((p, i) => {
          const h = max > 0 ? Math.max((p.messages / max) * 100, 3) : 0;
          return (
            <div key={i} className="relative flex-1 flex flex-col items-center justify-end h-full group">
              {p.messages > 0 && (
                <span className="mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {p.messages}
                </span>
              )}
              <div
                className="w-full max-w-[26px] rounded-md bg-gradient-to-t from-emerald-500/80 to-green-500/80 group-hover:from-emerald-500 group-hover:to-green-500 transition-colors"
                style={{ height: `${h}%` }}
                title={`${p.label}: ${p.messages} pesan`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 mt-1.5">
        {data.map((p, i) => (
          <span key={i} className="flex-1 text-center text-[10px] uppercase tracking-wide text-zinc-400">
            {p.label}
          </span>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {totalMsgs.toLocaleString()} pesan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          {totalChats.toLocaleString()} percakapan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {totalUsers.toLocaleString()} user baru
        </span>
      </div>
    </div>
  );
}

function CategoryList({ data }: { data: Stats["categories"] }) {
  const total = data.reduce((s, c) => s + (c.n || 0), 0);
  if (data.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-400 text-center py-4">Belum ada kategori.</p>
    );
  }
  const colors = [
    "from-emerald-500 to-green-500",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-lime-400",
    "from-teal-500 to-teal-400",
  ];
  return (
    <div className="mt-4 space-y-3">
      {data.map((c, i) => {
        const pct = total > 0 ? Math.round((c.n / total) * 100) : 0;
        const label = c.cat || "Uncategorized";
        return (
          <div key={`${c.cat}-${i}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                <span className="text-zinc-400">#</span>
                {label}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {c.n} · {pct}%
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const trend = stats.trend ?? [];
  const categories = stats.categories ?? [];

  const cards = [
    {
      label: "Total Users",
      value: stats.users,
      icon: <Users size={16} />,
      chip: "bg-emerald-500/10 text-emerald-500",
      delta: trendDelta(trend.map((d) => d.users)),
    },
    {
      label: "Personas",
      value: stats.personas,
      icon: <BarChart3 size={16} />,
      chip: "bg-emerald-500/10 text-emerald-500",
      delta: null,
    },
    {
      label: "Conversations",
      value: stats.conversations,
      icon: <MessagesSquare size={16} />,
      chip: "bg-teal-500/10 text-teal-500",
      delta: trendDelta(trend.map((d) => d.conversations)),
    },
    {
      label: "Messages",
      value: stats.messages,
      icon: <MessageCircle size={16} />,
      chip: "bg-teal-500/10 text-teal-500",
      delta: trendDelta(trend.map((d) => d.messages)),
    },
    {
      label: "Open Reports",
      value: stats.reports,
      icon: <FileWarning size={16} />,
      chip: "bg-amber-500/10 text-amber-500",
      delta: null,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Charts</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Ringkasan aktivitas dan pertumbuhan platform Momono.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.chip}`}>
                {c.icon}
              </div>
              {c.delta != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                    c.delta >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                  title="Perbandingan 4 hari terakhir vs 4 hari sebelumnya"
                >
                  {c.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {c.delta >= 0 ? "+" : ""}
                  {c.delta}%
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {c.value.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Aktivitas 7 hari terakhir"
            sub="Pesan per hari"
            icon={<Activity size={15} />}
          >
            <BarTrend data={trend} />
          </Panel>
        </div>
        <Panel
          title="Kategori teratas"
          sub="Top personas"
          icon={<Hash size={15} />}
        >
          <CategoryList data={categories} />
        </Panel>
      </div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>
      </table>
    </div>
  );
}

function ViewUserButton({ userId, onViewUser }: { userId: string; onViewUser: (id: string) => void }) {
  return (
    <button
      {...navLink(`#/user/${userId}`, () => onViewUser(userId))}
      title="Lihat profil user"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus:outline-none"
    >
      <ExternalLink size={14} />
    </button>
  );
}

function DeleteButton({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={label}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 focus:outline-none"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

function UsersTable({
  users,
  busyId,
  onDelete,
  onViewUser,
}: {
  users: AdminUser[];
  busyId: string | null;
  onDelete: (id: number) => void;
  onViewUser: (id: string) => void;
}) {
  return (
    <Table headers={["ID", "Username", "Email", "Personas", "Chats", "Dibuat", "Admin", ""]}>
      {users.length === 0 && (
        <tr>
          <td colSpan={8} className="px-3 py-8 text-center text-zinc-400">
            Belum ada user.
          </td>
        </tr>
      )}
      {users.map((u) => (
        <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <td className="px-3 py-2 text-zinc-400">{u.id}</td>
          <td className="px-3 py-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">@{u.username}</p>
            {u.display_name && (
              <p className="text-xs text-zinc-400">{u.display_name}</p>
            )}
          </td>
          <td className="px-3 py-2 text-zinc-500">{u.email || "-"}</td>
          <td className="px-3 py-2 text-zinc-500">{u.personas}</td>
          <td className="px-3 py-2 text-zinc-500">{u.conversations}</td>
          <td className="px-3 py-2 text-zinc-500">{fmtDate(u.created_at)}</td>
          <td className="px-3 py-2">
            {u.is_admin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                <Shield size={11} /> Admin
              </span>
            ) : (
              <span className="text-xs text-zinc-400">-</span>
            )}
          </td>
          <td className="px-3 py-2 flex gap-1">
            <ViewUserButton userId={String(u.id)} onViewUser={onViewUser} />
            <DeleteButton
              busy={busyId === String(u.id)}
              onClick={() => onDelete(u.id)}
              label="Hapus user"
            />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function PersonasTable({
  personas,
  busyId,
  onDelete,
  onViewUser,
}: {
  personas: AdminPersona[];
  busyId: string | null;
  onDelete: (id: string) => void;
  onViewUser: (id: string) => void;
}) {
  return (
    <Table headers={["Nama", "Kategori", "Dibuat oleh", "Chats", "Likes", "Dislikes", ""]}>
      {personas.length === 0 && (
        <tr>
          <td colSpan={7} className="px-3 py-8 text-center text-zinc-400">
            Belum ada karakter.
          </td>
        </tr>
      )}
      {personas.map((p) => (
        <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <td className="px-3 py-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
            {p.title && <p className="text-xs text-zinc-400">{p.title}</p>}
          </td>
          <td className="px-3 py-2 text-zinc-500">{p.categories || "-"}</td>
          <td className="px-3 py-2 text-zinc-500">
            {p.created_by || <span className="text-zinc-400">{p.user_id ? `user#${p.user_id}` : "-"}</span>}
          </td>
          <td className="px-3 py-2 text-zinc-500">{p.conversations}</td>
          <td className="px-3 py-2 text-zinc-500">{p.likes}</td>
          <td className="px-3 py-2 text-zinc-500">{p.dislikes}</td>
          <td className="px-3 py-2 flex gap-1">
            {p.user_id && <ViewUserButton userId={p.user_id} onViewUser={onViewUser} />}
            <DeleteButton busy={busyId === p.id} onClick={() => onDelete(p.id)} label="Hapus karakter" />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ReportsTable({
  reports,
  busyId,
  onResolve,
  onViewUser,
  onViewPersona,
}: {
  reports: AdminReport[];
  busyId: string | null;
  onResolve: (r: string, d: string) => void;
  onViewUser: (id: string) => void;
  onViewPersona?: (id: string) => void;
}) {
  return (
    <Table headers={["Tipe", "Pelapor", "Yang dilaporkan", "Alasan", "Waktu", ""]}>
      {reports.length === 0 && (
        <tr>
          <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
            Tidak ada laporan. Mantap!
          </td>
        </tr>
      )}
      {reports.map((r) => {
        const isChar = r.target_type === "character";
        return (
        <tr key={`${r.reporter_id}-${r.reported_id}-${r.target_type ?? "user"}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <td className="px-3 py-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isChar ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}>
              {isChar ? "Character" : "User"}
            </span>
          </td>
          <td className="px-3 py-2">
            <button
              {...navLink(`#/user/${r.reporter_id}`, () => onViewUser(r.reporter_id))}
              className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              @{r.reporter_name}
            </button>
          </td>
          <td className="px-3 py-2">
            {isChar && onViewPersona ? (
              <button
                {...navLink(`#/profile/${r.reported_id}`, () => onViewPersona(r.reported_id))}
                className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
              >
                {r.reported_name}
              </button>
            ) : (
              <button
                {...navLink(`#/user/${r.reported_id}`, () => onViewUser(r.reported_id))}
                className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
              >
                @{r.reported_name}
              </button>
            )}
          </td>
          <td className="px-3 py-2 text-zinc-500 max-w-[300px] truncate">{r.reason || "-"}</td>
          <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
          <td className="px-3 py-2 flex gap-1">
            <DeleteButton
              busy={busyId === `${r.reporter_id}-${r.reported_id}`}
              onClick={() => onResolve(r.reporter_id, r.reported_id)}
              label="Tutup laporan"
            />
          </td>
        </tr>
        );
      })}
    </Table>
  );
}

function ConversationsTable({
  conversations,
  onViewUser,
}: {
  conversations: AdminConversation[];
  onViewUser: (id: string) => void;
}) {
  return (
    <Table headers={["Chat Title", "Character", "User", "Last Updated", ""]}>
      {conversations.length === 0 && (
        <tr>
          <td colSpan={5} className="px-3 py-8 text-center text-zinc-400">
            Belum ada percakapan.
          </td>
        </tr>
      )}
      {conversations.map((c) => (
        <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{c.title}</td>
          <td className="px-3 py-2 text-zinc-500">{c.persona_name || "-"}</td>
          <td className="px-3 py-2 text-zinc-500">{c.user_id ? `user#${c.user_id}` : "-"}</td>
          <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{fmtDate(c.updated_at)}</td>
          <td className="px-3 py-2">
            {c.user_id && <ViewUserButton userId={c.user_id} onViewUser={onViewUser} />}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ChatModelsEditor({
  models,
  token,
  onSaved,
}: {
  models: AdminChatModel[];
  token: string | null;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, AdminChatModel>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, AdminChatModel> = {};
    for (const m of models) map[m.key] = { ...m };
    setDrafts(map);
  }, [models]);

  function update(key: string, patch: Partial<AdminChatModel>) {
    setDrafts((d) => ({ ...d, [key]: { ...(d[key] as AdminChatModel), ...patch } }));
  }

  async function save(m: AdminChatModel) {
    setSaving(m.key);
    const ok = await getJSON<{ ok: boolean }>(`/api/admin/chat-models/${m.key}`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: m.label,
        description: m.description,
        prompt_tier1: m.prompt_tier1,
        prompt_tier2: m.prompt_tier2,
        sort_order: m.sort_order,
      }),
    });
    setSaving(null);
    if (ok?.ok) {
      setSavedKey(m.key);
      window.setTimeout(() => setSavedKey(null), 1500);
      onSaved();
    }
  }

  const done = (m: AdminChatModel) =>
    JSON.stringify(drafts[m.key]) === JSON.stringify(m);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Chat Models</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Gaya respons per chat. Tier 1 = engine dengan guardrail (opsi prompt ringan/suggestif),
          Tier 2 = engine uncensored. Sesuaikan percabangan prompt di sini.
        </p>
      </div>

      {models.length === 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-400">
          Belum ada chat model.
        </div>
      )}

      {models.map((m) => {
        const draft = drafts[m.key] ?? m;
        const isSaved = savedKey === m.key;
        const isSaving = saving === m.key;
        return (
          <div
            key={m.key}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {m.key}
              </span>
              <input
                value={draft.label}
                onChange={(e) => update(m.key, { label: e.target.value })}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
              <span className="text-xs text-zinc-400">Urutan</span>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => update(m.key, { sort_order: Number(e.target.value) || 0 })}
                className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
              <button
                onClick={() => save(draft)}
                disabled={isSaving || done(draft)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors focus:outline-none"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan"}
              </button>
            </div>

            <input
              value={draft.description}
              onChange={(e) => update(m.key, { description: e.target.value })}
              placeholder="Deskripsi singkat (ditampilkan sebagai tooltip)"
              className="mt-3 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Prompt Tier 1 (Normal)
                </span>
                <textarea
                  value={draft.prompt_tier1}
                  onChange={(e) => update(m.key, { prompt_tier1: e.target.value })}
                  rows={5}
                  className="mt-1 w-full resize-y rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Prompt Tier 2 (NSFW)
                </span>
                <textarea
                  value={draft.prompt_tier2}
                  onChange={(e) => update(m.key, { prompt_tier2: e.target.value })}
                  rows={5}
                  className="mt-1 w-full resize-y rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}