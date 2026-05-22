import { Skeleton } from '@getx/ui';

/* Streamed while any /profile/* sub-route resolves its data. Generic
   skeleton — matches the common dashboard layout (sidebar + main panel)
   used by orders, wallet, requests, settings. */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen">
      <div className="container max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-12 w-12 rounded-full" aria-label="Loading profile" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar nav */}
          <aside className="hidden lg:block space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </aside>

          {/* Main panel */}
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" aria-label="Loading section" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
