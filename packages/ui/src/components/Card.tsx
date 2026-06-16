import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type CardProps<TElement extends ElementType = 'section'> = {
  as?: TElement;
  eyebrow?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
} & Omit<ComponentPropsWithoutRef<TElement>, 'as' | 'title'>;

export function Card<TElement extends ElementType = 'section'>({
  as,
  eyebrow,
  title,
  actions,
  children,
  className,
  ...props
}: CardProps<TElement>) {
  const Component = as ?? 'section';
  const classes = ['vhv-card', 'vhv-card--content', className].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...props}>
      {(eyebrow || title || actions) && (
        <header className="vhv-card__header">
          <div>
            {eyebrow && <p className="vhv-card__eyebrow">{eyebrow}</p>}
            {title && <h2 className="vhv-card__title">{title}</h2>}
          </div>
          {actions && <div className="vhv-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </Component>
  );
}
