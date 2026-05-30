import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}

/**
 * Prev / Next pill button used by every paginated admin list page.
 * Extracted from the identical inline copy that existed in users, orders,
 * listings, reviews, and audit-logs pages.
 */
export function PaginationButton({ dir, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-[12.5px] font-semibold transition-colors
        ${
          disabled
            ? 'bg-muted/15 text-muted-foreground/50 cursor-not-allowed'
            : 'bg-muted/25 hover:bg-muted/40 ring-1 ring-border text-foreground'
        }
      `}
    >
      {dir === 'prev' ? (
        <>
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </>
      ) : (
        <>
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </>
      )}
    </button>
  );
}
