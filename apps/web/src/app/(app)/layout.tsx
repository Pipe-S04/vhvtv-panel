import { Sidebar } from '@/components/layout/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 py-6 pt-16 sm:px-6 lg:px-8 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
