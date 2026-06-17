import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardEyebrow, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/skeleton';
import { StatusDot } from '../components/ui/status-dot';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Online</Badge>);
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('applies tone classes', () => {
    const { container } = render(<Badge tone="success">OK</Badge>);
    expect(container.firstElementChild?.className).toContain('status-online');
  });

  it('renders all tone variants', () => {
    const tones = ['gold', 'neutral', 'success', 'warning', 'danger', 'info'] as const;
    for (const tone of tones) {
      const { unmount } = render(<Badge tone={tone}>{tone}</Badge>);
      expect(screen.getByText(tone)).toBeDefined();
      unmount();
    }
  });
});

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Klick</Button>);
    expect(screen.getByText('Klick')).toBeDefined();
  });

  it('renders all variants', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByText(variant)).toBeDefined();
      unmount();
    }
  });

  it('renders disabled state', () => {
    render(<Button disabled>Deaktiviert</Button>);
    expect(screen.getByText('Deaktiviert').closest('button')?.disabled).toBe(true);
  });

  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>{size}</Button>);
      expect(screen.getByText(size)).toBeDefined();
      unmount();
    }
  });
});

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card>
        <CardContent>
          <CardEyebrow>Label</CardEyebrow>
          <CardTitle>Titel</CardTitle>
          <p>Inhalt</p>
        </CardContent>
      </Card>,
    );
    expect(screen.getByText('Label')).toBeDefined();
    expect(screen.getByText('Titel')).toBeDefined();
    expect(screen.getByText('Inhalt')).toBeDefined();
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="Keine Daten"
        description="Es sind keine Einträge vorhanden."
      />,
    );
    expect(screen.getByText('Keine Daten')).toBeDefined();
    expect(screen.getByText('Es sind keine Einträge vorhanden.')).toBeDefined();
  });

  it('renders action', () => {
    render(
      <EmptyState
        title="Leer"
        action={<Button>Hinzufügen</Button>}
      />,
    );
    expect(screen.getByText('Hinzufügen')).toBeDefined();
  });
});

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).toBeDefined();
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Pflichtfeld" />);
    expect(screen.getByText('Pflichtfeld')).toBeDefined();
  });
});

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    expect(container.firstElementChild).toBeDefined();
    expect(container.firstElementChild?.className).toContain('animate-pulse');
  });

  it('renders SkeletonCard', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders SkeletonTable with rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const children = container.firstElementChild?.children;
    expect(children).toBeDefined();
    expect(children!.length).toBe(4); // 1 header + 3 rows
  });
});

describe('StatusDot', () => {
  it('renders without label', () => {
    const { container } = render(<StatusDot status="online" />);
    expect(container.firstElementChild?.children.length).toBe(1);
  });

  it('renders with label', () => {
    render(<StatusDot status="online" showLabel />);
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('renders offline status', () => {
    render(<StatusDot status="offline" showLabel />);
    expect(screen.getByText('Offline')).toBeDefined();
  });
});
