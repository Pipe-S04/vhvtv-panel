import { cn, getStatusColors, getStatusLabel } from '@/lib/utils';

type StatusDotProps = {
  status: string;
  showLabel?: boolean;
  className?: string;
};

export function StatusDot({ status, showLabel = false, className }: StatusDotProps) {
  const colors = getStatusColors(status);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn('h-2.5 w-2.5 rounded-full', colors.dot)}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={cn('text-sm font-medium', colors.text)}>
          {getStatusLabel(status)}
        </span>
      )}
    </span>
  );
}
