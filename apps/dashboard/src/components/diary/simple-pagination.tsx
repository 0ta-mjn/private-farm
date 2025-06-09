"use client";

import React from "react";
import { Button } from "@/shadcn/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        前へ
      </Button>

      <span className="text-sm text-muted-foreground px-4">
        {currentPage} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        次へ
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
