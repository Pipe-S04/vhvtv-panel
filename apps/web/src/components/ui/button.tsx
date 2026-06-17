import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-br from-primary-light to-cyan text-[#02111f] hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-primary/12 border-border-strong text-primary-light hover:-translate-y-0.5 active:translate-y-0',
  ghost:
    'bg-transparent border-border text-text-muted hover:bg-surface-hover hover:text-vhv-text',
  danger:
    'bg-ruby/13 border-ruby/42 text-[#ff9aa5] hover:-translate-y-0.5 active:translate-y-0',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center rounded-full border border-transparent font-bold',
          'transition-all duration-150 ease-in-out',
          'focus-visible:shadow-[0_0_0_3px_rgba(32,217,255,0.24)] focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
