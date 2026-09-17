import { useState } from "react";

type Props = {
  onLogin: (token: string) => void;
};

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const isEmail = username.includes("@");
    const body =
      mode === "register"
        ? { username, email, password }
        : isEmail
        ? { email: username, password }
        : { username, password };
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let data: Record<string, string>;
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text || "Terjadi kesalahan" };
      }

      if (!r.ok) {
        setError(data.detail || "Terjadi kesalahan");
        return;
      }

      if (mode === "register") {
        setMode("login");
        setError("");
        return;
      }

      onLogin(data.token);
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-lg"
      >
        <h1 className="text-xl font-bold text-center mb-1">Momono</h1>
        <p className="text-xs text-zinc-500 text-center mb-6">
          Multi-language AI Chatbot
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <label className="block mb-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {mode === "login" ? "Username or Email" : "Username"}
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </label>

        {mode === "register" && (
          <label className="block mb-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </label>
        )}

        <label className="block mb-5">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            minLength={8}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 text-white py-2 font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : mode === "login"
            ? "Login"
            : "Register"}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/auth/github";
          }}
          className="w-full mt-3 rounded-lg bg-zinc-800 text-white py-2 font-medium text-sm hover:bg-zinc-700 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Login with GitHub
        </button>

        <p className="text-xs text-center mt-4 text-zinc-500">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setEmail("");
            }}
            className="text-emerald-600 hover:underline"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}
