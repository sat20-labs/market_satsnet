import React from 'react';
import { Activity } from './types';
import { ActivityTable } from './ActivityTable';
import { CustomPagination } from "@/components/ui/CustomPagination";

/**
 * 活动内容区组件，包含表格和分页
 * @param {Object} props
 * @param {Activity[]} props.activities 活动数据
 * @param {boolean} props.isLoading 是否加载中
 * @param {Error | null | undefined} props.error 错误信息
 * @param {number} props.currentPage 当前页
 * @param {number} props.totalPages 总页数
 * @param {(page: number) => void} props.onPageChange 页码变化回调
 * @param {number} props.pageSize 当前每页数量
 * @param {(size: number) => void} props.onPageSizeChange 每页数量变化回调
 * @param {number[]} props.availablePageSizes 可选的每页数量
 */
export const ActivityContent = ({
  activities,
  isLoading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  availablePageSizes,
}: {
  activities: Activity[],
  isLoading: boolean,
  error?: Error | null,
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void,
  pageSize: number,
  onPageSizeChange: (size: number) => void,
  availablePageSizes: number[],
}) => {
  return (
    <>
      <div className="mt-4">
        <ActivityTable
          activities={activities}
          isLoading={isLoading}
          error={error}
        />
      </div>
      {activities.length > 0 && (
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          availablePageSizes={availablePageSizes}
          isLoading={isLoading}
        />
      )}
    </>
  );
}; 