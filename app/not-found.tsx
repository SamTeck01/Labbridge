import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-teal-400">404</h1>
        <h2 className="text-xl font-semibold text-slate-200">Station Not Found</h2>
        <p className="text-sm text-slate-400">
          The laboratory station or specimen you requested could not be located in this facility.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            Return to Laboratory
          </Link>
        </div>
      </div>
    </main>
  );
}
