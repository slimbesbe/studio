import { DemoGuard } from '@/components/dashboard/DemoGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoGuard>
      <div className="h-full w-full p-6 max-w-7xl mx-auto overflow-hidden box-border">
        {children}
      </div>
    </DemoGuard>
  );
}
