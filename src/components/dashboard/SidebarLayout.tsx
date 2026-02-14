
'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

/**
 * SidebarLayout component that conditionally renders the Sidebar and adjusts main content padding.
 * Only applies the left padding if the user is authenticated.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();

  // The sidebar is shown only if the user is authenticated
  const showSidebar = !!user && !isUserLoading;

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
