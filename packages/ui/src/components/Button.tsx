import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const classes = ['vhv-button', `vhv-button--${variant}`, className].filter(Boolean).join(' ');

  return <button className={classes} type={type} {...props} />;
}
