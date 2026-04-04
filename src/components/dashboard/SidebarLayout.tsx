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
 * SidebarLayout gère désormais une navigation hybride avec contrainte de hauteur stricte pour le dashboard,
 * tout en permettant le défilement (scrolling) pour l'interface admin.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const showNavigation = !!user && !isUserLoading && pathname !== '/' && pathname !== '/login';
  const isAdmin = pathname.startsWith('/admin');

  if (!showNavigation) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:block w-64 shrink-0 h-full border-r bg-white">
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
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navigation</SheetTitle>
              <SheetDescription>Accédez aux différentes sections de la plateforme de simulation PMP.</SheetDescription>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className={cn(
        "flex-1 flex flex-col min-h-0 h-full relative",
        isAdmin ? "overflow-auto" : "overflow-hidden",
        "transition-all duration-300 ease-in-out"
      )}>
        {children}
      </main>
    </div>
  );
}
