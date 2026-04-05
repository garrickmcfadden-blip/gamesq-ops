'use client';

export type SaveStatus = {
  type: 'idle' | 'saving' | 'success' | 'error';
  message?: string;
};

export function SaveStatusBanner({ status }: { status: SaveStatus }) {
  if (status.type === 'idle') return null;

  const styles =
    status.type === 'saving'
      ? 'border-sky-400/30 bg-sky-400/10 text-sky-100'
      : status.type === 'success'
        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
        : 'border-red-500/40 bg-red-500/10 text-red-100';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-glow ${styles}`}>
      {status.message}
    </div>
  );
}
