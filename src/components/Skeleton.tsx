import React from 'react';
import clsx from 'clsx';

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={clsx('animate-pulse rounded bg-gray-200 dark:bg-gray-800', className)} />;
};
