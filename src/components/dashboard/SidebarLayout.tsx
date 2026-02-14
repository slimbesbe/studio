'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/**
 * SidebarLayout component that conditionally renders the Sidebar and adjusts main content padding.
 * Only applies the left padding if the user is authenticated and not on the home page.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // The sidebar is shown only if the user is authenticated AND not on the home/login page
  const showSidebar = !!user && !isUserLoading && pathname !== '/';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        "min-h-screen transition-all duration-300 ease-in-out",
        showSidebar ? "pl-64" : "pl-0"
      )}>
        {children}
      </main>
    </div>
  );
}
