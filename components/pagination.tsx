"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
  pageSize,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  pageSize?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      {typeof total === "number" ? (
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "item" : "items"}
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {pageSize ? <span /> : null}
    </div>
  );
}
