'use client';
import { Spinner } from '@nextui-org/react';
import { Empty } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

interface InfiniteScrollProps {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  empty?: boolean;
  children: React.ReactNode;
  loading?: boolean;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
}

export function InfiniteScroll({
  loadMore,
  hasMore,
  children,
  loading: externalLoading,
  loader,
  empty,
  endMessage = '',
}: InfiniteScrollProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const observerTarget = useRef(null);

  const isLoading =
    externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading]);

  const handleLoadMore = async () => {
    setInternalLoading(true);
    setError(null);
    try {
      await loadMore();
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('An error occurred while loading more items'),
      );
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {children}
      {empty && <Empty className="mt-20" />}
      <div ref={observerTarget} className="flex justify-center p-4">
        {error && (
          <div className="text-red-500">
            Error: {error.message}
            <button
              onClick={handleLoadMore}
              className="ml-2 text-blue-500 underline"
            >
              Retry
            </button>
          </div>
        )}
        {!error && isLoading && (loader || <Spinner />)}
        {!error && !isLoading && !hasMore && endMessage}
      </div>
    </div>
  );
}
