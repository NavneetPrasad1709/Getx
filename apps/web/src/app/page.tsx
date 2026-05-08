export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 bg-slate-50 text-slate-900">
      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
        Buyer
      </span>
      <h1 className="text-5xl font-bold">GETX</h1>
      <p className="text-slate-500">Get X. Get gaming.</p>
      <p className="mt-6 text-sm text-slate-400">apps/web · localhost:3000</p>
      <p className="text-xs text-slate-400">Prompt 1: scaffold ✓ · Prompt 2: theme system →</p>
    </main>
  );
}
