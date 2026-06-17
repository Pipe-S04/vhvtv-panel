import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-vhv-text placeholder:text-text-subtle',
            'transition-colors duration-150',
            'focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-border-strong',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-ruby/50 focus:border-ruby focus:ring-ruby/30',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-ruby">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
