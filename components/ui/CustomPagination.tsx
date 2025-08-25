'use client';

import React from 'react';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  availablePageSizes: number[];
  isLoading?: boolean;
}

export const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  availablePageSizes,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 640 });
  // Maximum number of page links to show
  const MAX_VISIBLE_PAGES = isMobile ? 1 : 5;

  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (!isLoading) {
      onPageChange(pageNumber);
    }
  };

  const handleSizeChange = (value: string) => {
    if (!isLoading) {
      onPageSizeChange(Number(value));
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers: React.ReactNode[] = [];
    
    // For mobile, show a simplified version
    if (isMobile) {
      // Just show current page number
      pageNumbers.push(
        <PaginationItem key={currentPage}>
          <PaginationLink isActive={true}>
            {currentPage}
          </PaginationLink>
        </PaginationItem>
      );
      
      return pageNumbers;
    }
    
    // For desktop, show the standard pagination
    const startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    const endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

    if (startPage > 1) {
      pageNumbers.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => handlePageClick(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        pageNumbers.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageClick(i)} isActive={currentPage === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
      }
      pageNumbers.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageClick(totalPages)} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageNumbers;
  };

  if (totalPages <= 0) return null;

  return (
    <div className="flex flex-row justify-between items-center gap-4 my-4">
      <Pagination className="justify-start flex-grow">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={handlePrevious}
              className={currentPage <= 1 || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem>
            <PaginationNext
              onClick={handleNext}
              className={currentPage >= totalPages || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="flex items-center gap-1 justify-end">
        <span className="text-sm text-gray-400 whitespace-nowrap">{t('common.items_per_page')}</span>
        <Select
          value={String(pageSize)}
          onValueChange={handleSizeChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[65px] h-8 text-xs sm:text-sm bg-zinc-800 border-zinc-700 text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-300">
            {availablePageSizes.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs sm:text-sm">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};