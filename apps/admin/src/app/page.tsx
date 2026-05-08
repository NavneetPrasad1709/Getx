export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 bg-slate-900 text-slate-100">
      <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-900">
        Admin
      </span>
      <h1 className="text-5xl font-bold">GETX Admin</h1>
      <p className="text-slate-400">admin.getx.gg · IP-restricted</p>
      <p className="mt-6 text-sm text-slate-500">apps/admin · localhost:3002</p>
      <p className="text-xs text-slate-500">Prompt 1: scaffold ✓</p>
    </main>
  );
}
