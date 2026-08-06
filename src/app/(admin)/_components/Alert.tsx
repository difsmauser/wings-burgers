'use client';

import { ReactNode } from 'react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; iconPath: string }> = {
  success: {
    container: 'bg-green-50 border-green-300 text-green-800',
    icon: 'text-green-500',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    container: 'bg-fire-50 border-fire-300 text-fire-800',
    icon: 'text-fire-500',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    container: 'bg-golden-50 border-golden-300 text-golden-800',
    icon: 'text-golden-500',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  info: {
    container: 'bg-brand-50 border-brand-300 text-brand-800',
    icon: 'text-brand-500',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export default function Alert({ variant, title, children, onDismiss, className = '' }: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${styles.container} ${className}`}
      role="alert"
    >
      {/* Icon */}
      <svg
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.iconPath} />
      </svg>

      {/* Content */}
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-black/5 transition-colors"
          aria-label="Cerrar alerta"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
