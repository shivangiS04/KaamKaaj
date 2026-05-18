import React from 'react';
import { SkeletonBlock } from './Skeleton';

export const PageHeaderSkeleton: React.FC<{ withAction?: boolean }> = ({ withAction }) => {
  return (
    <header className="bg-white shadow dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <SkeletonBlock className="h-7 w-64" />
          </div>
          {withAction ? <SkeletonBlock className="h-10 w-36" /> : null}
        </div>
      </div>
    </header>
  );
};

export const StatCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-8 w-16" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
};

export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
};

export const ListRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-6 flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-56" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
};

export const FiltersSkeleton: React.FC<{ fields?: number; columns?: 1 | 2 | 3 | 4 | 5 }> = ({
  fields = 3,
  columns = 3,
}) => {
  const gridCols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 md:grid-cols-3'
          : columns === 4
            ? 'grid-cols-1 md:grid-cols-4'
            : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5';

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className={`grid ${gridCols} gap-4`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ columns?: number; rows?: number; withHeader?: boolean }> = ({
  columns = 5,
  rows = 8,
  withHeader = true,
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {withHeader ? (
        <div className="px-6 py-4 border-b border-gray-200">
          <SkeletonBlock className="h-5 w-56" />
        </div>
      ) : null}
      <div className="divide-y divide-gray-200">
        <div className="px-6 py-3 bg-gray-50 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-4 flex gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <SkeletonBlock key={c} className="h-4 w-28" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
