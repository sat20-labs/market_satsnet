import React from "react";
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // 请确保路径正确

const getPageNumbers = (total: number, current: number, siblings = 1): (number | '...')[] => {
  const totalPageNumbers = siblings * 2 + 3 + 2; // 兄弟页码 + 当前页 + 第一页/最后一页 + 2个省略号

  if (total <= 0) return [];
  if (totalPageNumbers >= total) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblings, 1);
  const rightSiblingIndex = Math.min(current + siblings, total);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < total - 1;

  const firstPageIndex = 1;
  const lastPageIndex = total;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    let leftItemCount = 3 + 2 * siblings;
    let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', lastPageIndex];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    let rightItemCount = 3 + 2 * siblings;
    let rightRange = Array.from({ length: rightItemCount }, (_, i) => total - rightItemCount + 1 + i);
    return [firstPageIndex, '...', ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
  }

  // Default case: should not happen with the logic above but included for safety
  return Array.from({ length: total }, (_, i) => i + 1);
};


export const Pagination = ({ total, page, size, onChange }: { total: number; page: number; size?: number; onChange: (page: number) => void }) => {
  if (total <= 0) return null;
  const currentPage = Math.max(1, Math.min(page, total)); // 确保 page 在 1 和 total 之间

  const pageNumbers = getPageNumbers(total, currentPage);

  const handlePrevious = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (currentPage > 1) {
      onChange(currentPage - 1);
    }
  };

  const handleNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (currentPage < total) {
      onChange(currentPage + 1);
    }
  };

  const handlePageChange = (p: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (p !== currentPage) {
      onChange(p);
    }
  };

  if (total <= 1) {
    return null; // 如果只有一页或没有页，不显示分页
  }

  return (
    <ShadcnPagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={handlePrevious}
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : undefined}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
        {pageNumbers.map((p, index) => (
          <PaginationItem key={index}>
            {p === '...' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={(e) => handlePageChange(p as number, e)}
                isActive={currentPage === p}
                aria-current={currentPage === p ? "page" : undefined}
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={handleNext}
            aria-disabled={currentPage === total}
            tabIndex={currentPage === total ? -1 : undefined}
            className={currentPage === total ? "pointer-events-none opacity-50" : undefined}
           />
        </PaginationItem>
      </PaginationContent>
    </ShadcnPagination>
  );
};
