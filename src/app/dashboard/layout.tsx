import { DemoGuard } from '@/components/dashboard/DemoGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoGuard>
      <div className="w-full p-6 max-w-7xl mx-auto box-border">
        {children}
      </div>
    </DemoGuard>
  );
}
