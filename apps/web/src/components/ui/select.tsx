import { cn } from '@/lib/utils';
import { forwardRef, type SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-muted"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-8 text-sm text-vhv-text',
            'transition-colors duration-150',
            'focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-border-strong',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-ruby/50 focus:border-ruby focus:ring-ruby/30',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-ruby">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
