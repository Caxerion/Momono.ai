import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  FileWarning,
  LayoutDashboard,
  Loader2,
  MessagesSquare,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

type Props = {
  token: string | null;
  tab: Tab;
  onChangeTab: (tab: Tab) => void;
  onBack: () => void;
  onViewUser: (userId: string) => void;
};

type Stats = {
  users: number;
  personas: number;
  conversations: number;
  messages: number;
  reports: number;
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

export type Tab =
  | "dashboard"
  | "users"
  | "personas"
  | "reports"
  | "conversations";

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

export default function Admin({ token, tab, onChangeTab, onBack, onViewUser }: Props) {
  const setTab = onChangeTab;
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [personas, setPersonas] = useState<AdminPersona[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
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
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none"
          title="Kembali ke sisi user"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
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
      </header>

      {/* Tabs */}
      <nav className="flex gap-1.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
              tab === t.key
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
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
          <ReportsTable reports={reports} busyId={busyId} onResolve={resolveReport} onViewUser={onViewUser} />
        ) : (
          <ConversationsTable conversations={conversations} onViewUser={onViewUser} />
        )}
      </div>
    </div>
  );
}

function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Users", value: stats.users, icon: <Users size={18} /> },
    { label: "Personas", value: stats.personas, icon: <BarChart3 size={18} /> },
    { label: "Conversations", value: stats.conversations, icon: <MessagesSquare size={18} /> },
    { label: "Messages", value: stats.messages, icon: <MessagesSquare size={18} /> },
    { label: "Open Reports", value: stats.reports, icon: <FileWarning size={18} /> },
  ];
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
        Ringkasan
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              {c.icon}
              <span className="text-xs font-medium">{c.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {c.value.toLocaleString()}
            </p>
          </div>
        ))}
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
      onClick={() => onViewUser(userId)}
      title="Lihat profil user"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none"
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
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[11px] font-medium">
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
}: {
  reports: AdminReport[];
  busyId: string | null;
  onResolve: (r: string, d: string) => void;
  onViewUser: (id: string) => void;
}) {
  return (
    <Table headers={["Pelapor", "Yang dilaporkan", "Alasan", "Waktu", ""]}>
      {reports.length === 0 && (
        <tr>
          <td colSpan={5} className="px-3 py-8 text-center text-zinc-400">
            Tidak ada laporan. Mantap!
          </td>
        </tr>
      )}
      {reports.map((r) => (
        <tr key={`${r.reporter_id}-${r.reported_id}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <td className="px-3 py-2">
            <button
              onClick={() => onViewUser(r.reporter_id)}
              className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              @{r.reporter_name}
            </button>
          </td>
          <td className="px-3 py-2">
            <button
              onClick={() => onViewUser(r.reported_id)}
              className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              @{r.reported_name}
            </button>
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
      ))}
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
    <Table headers={["Judul", "Karakter", "User", "Terakhir update", ""]}>
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