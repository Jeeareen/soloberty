import Link from 'next/link';

export default async function HealthPage() {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1', {
    cache: 'no-store',
  });
  const data = await res.json();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] p-6 flex items-start justify-center pt-12 transition-colors duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl space-y-4 border border-slate-200/80 dark:border-slate-800 p-6">
        <h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Status: OK
        </h1>
        <pre className="p-4 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-xl text-sm overflow-x-auto border border-slate-200/60 dark:border-slate-700/60">
          {JSON.stringify(data, null, 2)}
        </pre>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link href="/profile" className="text-sm text-[#00AAFF] dark:text-[#B8E7FF] hover:underline font-extrabold flex items-center gap-1">
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
