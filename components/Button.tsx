'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-xl
    transition-all duration-200 press-effect
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;

  const variants = {
    primary: 'bg-surface-900 text-white hover:bg-surface-800 focus-visible:ring-surface-500 shadow-sm',
    secondary: 'bg-surface-200 text-surface-800 hover:bg-surface-300 focus-visible:ring-surface-400',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500 shadow-sm shadow-accent-500/20',
    danger: 'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500 shadow-sm shadow-error-500/20',
    ghost: 'bg-transparent text-surface-600 hover:bg-surface-200 focus-visible:ring-surface-400',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px] gap-1.5',
    md: 'px-4 py-2.5 text-base min-h-[44px] gap-2',
    lg: 'px-6 py-3.5 text-lg min-h-[52px] gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Cargando...</span>
        </>
      ) : children}
    </button>
  );
}
