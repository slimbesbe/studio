import { DemoGuard } from '@/components/dashboard/DemoGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoGuard>
      <div className="p-8 max-w-7xl mx-auto">
        {children}
      </div>
    </DemoGuard>
  );
}
