'use client';

import { Button } from '@getx/ui';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  const getPageNumbers = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p)}
              className="min-w-[36px]"
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
