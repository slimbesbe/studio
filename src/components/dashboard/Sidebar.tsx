
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Brain, 
  Settings, 
  LogOut, 
  Trophy,
  User,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pratique Libre', href: '/dashboard/practice', icon: BookOpen },
  { name: 'Simulations d\'Examen', href: '/dashboard/exam', icon: Trophy },
  { name: 'Kill Mistakes', href: '/dashboard/kill-mistakes', icon: Brain },
  { name: 'Historique', href: '/dashboard/history', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white border-r w-64 fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b">
        <Link className="flex items-center gap-2" href="/">
          <div className="bg-primary p-1 rounded-md">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <span className="font-headline font-bold text-lg text-primary">INOVEXIO</span>
        </Link>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        ))}
        
        <div className="pt-4 mt-4 border-t">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Administration</p>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
          >
            <Settings className="h-4 w-4" />
            Super Admin
          </Link>
        </div>
      </div>

      <div className="p-4 border-t space-y-4">
        <div className="flex items-center gap-3 px-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white font-bold">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">Jean Dupont</p>
            <p className="text-xs text-muted-foreground truncate">Participant</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" asChild>
          <Link href="/login">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Link>
        </Button>
      </div>
    </div>
  );
}
