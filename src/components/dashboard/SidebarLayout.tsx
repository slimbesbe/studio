'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SimuLuxLogo } from './Sidebar';

/**
 * SidebarLayout gère désormais une navigation hybride :
 * - Desktop : Sidebar fixe à gauche.
 * - Mobile : Header avec bouton Menu et Sidebar dans un Drawer (Sheet).
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fermer le menu mobile lors d'un changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const showNavigation = !!user && !isUserLoading && pathname !== '/' && pathname !== '/login';

  if (!showNavigation) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:block w-64 shrink-0">
        <Sidebar />
      </aside>

      {/* --- MOBILE HEADER --- */}
      <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="h-8 w-24 relative">
          <SimuLuxLogo className="h-full w-full" />
        </div>
        
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl border-2">
              <Menu className="h-6 w-6 text-primary" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-4 border-primary/10">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className={cn(
        "flex-1 flex flex-col h-[calc(100vh-64px)] lg:h-screen overflow-y-auto relative",
        "transition-all duration-300 ease-in-out"
      )}>
        {children}
      </main>
    </div>
  );
}
