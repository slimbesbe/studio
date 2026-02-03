"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Brain, 
  Settings, 
  LogOut, 
  Trophy,
  ShieldAlert,
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pratique Libre', href: '/dashboard/practice', icon: BookOpen },
  { name: 'Simulations d\'Examen', href: '/dashboard/exam', icon: Trophy },
  { name: 'Kill Mistakes', href: '/dashboard/kill-mistakes', icon: Brain },
  { name: 'Historique', href: '/dashboard/history', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isDemo = user?.isAnonymous;

  const userProfileRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null;
  }, [firestore, user]);

  const { data: profile } = useDoc(userProfileRef);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isDemo && href !== '/dashboard/practice') {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Mode DEMO",
        description: "Non disponible en mode DEMO"
      });
    }
  };

  const initials = isDemo 
    ? 'D'
    : profile?.firstName && profile?.lastName 
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : user?.email?.[0].toUpperCase() || '?';

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
            href={isDemo && item.href !== '/dashboard/practice' ? '#' : item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:bg-secondary hover:text-primary",
              isDemo && item.href !== '/dashboard/practice' && "opacity-50"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.name}
            </div>
            {isDemo && item.href !== '/dashboard/practice' && <Lock className="h-3 w-3" />}
          </Link>
        ))}
        
        {!isDemo && (
          <div className="pt-4 mt-4 border-t">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Administration</p>
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === '/admin/dashboard' 
                  ? "bg-accent text-white" 
                  : "text-muted-foreground hover:bg-secondary hover:text-primary"
              )}
            >
              <Settings className="h-4 w-4" />
              Super Admin
            </Link>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-4">
        {isUserLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs",
              isDemo ? "bg-amber-500" : "bg-accent"
            )}>
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">
                {isDemo ? "Utilisateur DEMO" : (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (user?.email?.split('@')[0] || 'Utilisateur'))}
              </p>
              <p className="text-xs text-muted-foreground truncate italic">
                {isDemo ? "Mode limité" : (profile?.roleId === 'super_admin' ? 'Super Admin' : 'Participant')}
              </p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
