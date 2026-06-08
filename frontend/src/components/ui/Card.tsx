import { twMerge } from 'tailwind-merge';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={twMerge('bg-slate-800 border border-slate-700 rounded-xl p-4', className)}
    />
  );
}
