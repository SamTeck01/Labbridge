'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Laboratory Application Error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-rose-400">Simulation Error</h1>
        <p className="text-sm text-slate-400">
          An unexpected interruption occurred in the laboratory simulation environment.
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
          >
            Reset Simulator
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Laboratory Main
          </Link>
        </div>
      </div>
    </main>
  );
}
