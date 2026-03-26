'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/**
 * SidebarLayout component that conditionally renders the Sidebar and adjusts main content padding.
 * Enforces h-screen and overflow-hidden to allow children to use flex layouts for single-page view.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // The sidebar is shown only if the user is authenticated AND not on the home/login page
  const showSidebar = !!user && !isUserLoading && pathname !== '/' && pathname !== '/login';

  return (
    <div className="h-screen bg-background overflow-hidden flex">
      <Sidebar />
      <main className={cn(
        "flex-1 h-screen transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
        showSidebar ? "pl-64" : "pl-0"
      )}>
        {children}
      </main>
    </div>
  );
}
