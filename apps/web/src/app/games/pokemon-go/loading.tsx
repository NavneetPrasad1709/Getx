import { Skeleton } from '@getx/ui';

/* Streamed while the game tab's data resolves. Skeleton mirrors the
   final layout (header strip + 12 listing tiles in a 4-col grid) so
   the chrome stays stable and CLS stays near zero. */
export default function PokemonGoLoading() {
  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl px-4 sm:px-6 py-6">
        {/* Game header strip */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-16 w-16 rounded-2xl" aria-label="Loading game" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full shrink-0" />
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>

        {/* Listings grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
          aria-label="Loading listings"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
