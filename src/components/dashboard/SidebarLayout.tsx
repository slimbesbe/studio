'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/**
 * SidebarLayout component that conditionally renders the Sidebar and adjusts main content padding.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // The sidebar is shown only if the user is authenticated AND not on the home/login page
  const showSidebar = !!user && !isUserLoading && pathname !== '/' && pathname !== '/login';

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out flex flex-col",
        showSidebar ? "pl-64" : "pl-0"
      )}>
        {children}
      </main>
    </div>
  );
}
