
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  LogOut, 
  Trophy,
  Loader2,
  BookCopy,
  Users,
  LayoutGrid,
  ShieldAlert,
  GraduationCap,
  LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, profile } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const isDemo = user?.isAnonymous;

  const adminDocRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(firestore, 'roles_admin', user.uid) : null;
  }, [firestore, user]);

  const { data: adminDoc } = useDoc(adminDocRef);

  // Détection du rôle admin (Super Admin direct ou via document roles_admin)
  const isAdmin = !!adminDoc || profile?.role === 'super_admin' || profile?.role === 'admin';

  // Logic pour filtrer les menus selon accessType
  const accessType = profile?.accessType || 'simulation';
  const showSimulationMenus = isAdmin || accessType === 'simulation' || accessType === 'coaching_simulation';
  const showCoachingMenu = isAdmin || accessType === 'coaching' || accessType === 'coaching_simulation';

  const navItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, show: !!user },
    { name: 'Coaching', href: '/dashboard/coaching', icon: GraduationCap, show: !!user && showCoachingMenu },
    { name: 'Pratique Libre', href: '/dashboard/practice', icon: BookOpen, show: !!user && showSimulationMenus },
    { name: 'Simulations d\'Examen', href: '/dashboard/exam', icon: Trophy, show: !!user && showSimulationMenus },
    { name: 'Historique', href: '/dashboard/history', icon: History, show: !!user && showSimulationMenus },
  ];

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
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
          <span className="font-headline font-bold text-lg text-primary">SIMOVEX</span>
        </Link>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {!user && !isUserLoading && (
          <div className="px-3 py-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed italic">
              Connectez-vous pour accéder à vos outils.
            </p>
          </div>
        )}

        {navItems.filter(i => i.show).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href 
                ? "bg-primary text-white shadow-sm" 
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.name}
            </div>
          </Link>
        ))}
        
        {isAdmin && user && (
          <div className="pt-4 mt-4 border-t space-y-1">
            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-2">Administration</p>
            <Link href="/admin/dashboard" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", pathname === '/admin/dashboard' ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary")}>
              <LayoutGrid className="h-4 w-4" /> Vue d'ensemble
            </Link>
            <Link href="/admin/coaching" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", pathname.startsWith('/admin/coaching') ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary")}>
              <GraduationCap className="h-4 w-4" /> Coaching
            </Link>
            <Link href="/admin/questions" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", pathname.startsWith('/admin/questions') ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary")}>
              <BookCopy className="h-4 w-4" /> Banque de questions
            </Link>
            <Link href="/admin/users" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", pathname.startsWith('/admin/users') ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary")}>
              <Users className="h-4 w-4" /> Utilisateurs
            </Link>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-4">
        {isUserLoading ? (
          <div className="flex items-center justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : user ? (
          <>
            <div className="flex items-center gap-3 px-3">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs", isDemo ? "bg-amber-500" : (isAdmin ? "bg-primary" : "bg-accent"))}>
                {initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{profile?.firstName ? `${profile.firstName} ${profile.lastName}` : isDemo ? 'Visiteur Démo' : 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground truncate italic">{isAdmin ? 'Super Admin' : isDemo ? 'Mode Démo' : 'Participant'}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </>
        ) : (
          <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase italic tracking-widest text-[10px] border-2" asChild>
            <Link href="/"><LogIn className="mr-2 h-4 w-4" /> Se connecter</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
