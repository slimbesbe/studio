'use client';

import { useUser } from '@/firebase';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { SimuLuxLogo } from './Sidebar';

/**
 * SidebarLayout gère désormais une navigation avec défilement naturel.
 * La sidebar reste fixée (sticky) pendant que le contenu défile.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const showNavigation = !!user && !isUserLoading && pathname !== '/' && pathname !== '/login';

  if (!showNavigation) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row relative">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen border-r bg-white z-40">
        <Sidebar />
      </aside>

      {/* --- MOBILE HEADER --- */}
      <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-50">
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
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navigation</SheetTitle>
              <SheetDescription>Accédez aux différentes sections de la plateforme de simulation PMP.</SheetDescription>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative transition-all duration-300 ease-in-out p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
