
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DemoGuard } from '@/components/dashboard/DemoGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <DemoGuard>
          <div className="p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </DemoGuard>
      </main>
    </div>
  );
}
