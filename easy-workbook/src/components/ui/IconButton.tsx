import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  active?: boolean;
  tooltip?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs rounded-lg',
  md: 'w-9 h-9 text-sm rounded-lg',
  lg: 'w-10 h-10 text-base rounded-lg',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', active, tooltip, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        title={tooltip}
        className={`
          inline-flex shrink-0 items-center justify-center
          transition-all duration-200 ease-out
          active:scale-[0.92]
          disabled:opacity-40 disabled:pointer-events-none
          ${active
            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
          }
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
