import { useState } from "react";
import { Flag } from "lucide-react";

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
};

const REASONS = [
  "Spam or advertisement",
  "Offensive content",
  "Adult / inappropriate content",
  "Impersonation",
  "Other reason",
];

export default function ReportModal({ title, open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (!open) return null;

  async function submit() {
    setBusy(true);
    try {
      await onSubmit(reason);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Flag size={18} className="text-red-500" />
          <h2 className="font-bold text-lg">{title}</h2>
        </div>
        {done ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
            ✅ Report sent. Thank you for your feedback.
          </p>
        ) : (
          <>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm mb-3"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button onClick={submit} disabled={busy || !reason} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Sending..." : "Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}