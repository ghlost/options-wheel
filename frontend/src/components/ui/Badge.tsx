import { twMerge } from 'tailwind-merge';
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'call' | 'put' | 'neutral';
}

export function Badge({ variant = 'neutral', className, ...props }: Props) {
  return (
    <span
      {...props}
      className={twMerge(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'call' && 'bg-emerald-900/50 text-emerald-300',
        variant === 'put' && 'bg-rose-900/50 text-rose-300',
        variant === 'neutral' && 'bg-slate-700 text-slate-300',
        className
      )}
    />
  );
}
