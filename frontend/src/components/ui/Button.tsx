import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      {...props}
      className={twMerge(clsx(
        'inline-flex items-center justify-center rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-2 py-1 text-xs',
        size === 'md' && 'px-3 py-2 text-sm',
        variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700',
        variant === 'ghost' && 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-700',
        variant === 'danger' && 'bg-transparent text-red-400 hover:text-red-300 hover:bg-red-900/20',
        className
      ))}
    />
  );
}
