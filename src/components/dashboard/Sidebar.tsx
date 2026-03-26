
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  LogOut, 
  BookCopy,
  Users,
  GraduationCap,
  Database,
  History,
  Trophy,
  Brain,
  BookOpen,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

export const SimuLuxLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <path 
      d="M100,10 L30,35 L30,100 C30,155 100,190 100,190 C100,190 170,155 170,100 L170,35 Z" 
      fill="url(#shieldGrad)" 
    />
    <path 
      d="M60,140 C60,140 140,150 140,115 C140,80 60,95 60,60 C60,25 140,35 140,35" 
      fill="none" 
      stroke="white" 
      strokeWidth="24" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M140,20 L195,5 L180,60 L160,40 Z" 
      fill="#FFD700" 
    />
  </svg>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, profile } = useUser();
  const auth = useAuth();

  if (isUserLoading || !user || pathname === '/' || pathname === '/login') {
    return null;
  }

  const isDemo = user?.isAnonymous;
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

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
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300 w-64 fixed left-0 top-0 z-40 shadow-2xl">
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <Link className="flex items-center gap-3 group" href={isAdmin ? "/admin/dashboard" : "/dashboard"}>
          <SimuLuxLogo className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="font-black text-lg italic tracking-tighter text-white leading-none">Simu-lux</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{isAdmin ? 'Super Admin' : 'Membre'}</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        {/* Navigation Admin */}
        {isAdmin && (
          <>
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                pathname === '/admin/dashboard' 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard Admin
            </Link>

            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-blue-500/20",
                pathname === '/dashboard' 
                  ? "bg-blue-900/40 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <User className="h-5 w-5 text-blue-400" />
              Vue Élève
            </Link>

            <div className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pilotage</div>
            
            <Link href="/admin/coaching" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/admin/coaching') ? "bg-slate-800/50 text-white" : "")}>
              <GraduationCap className="h-5 w-5" /> Coaching
            </Link>
            <Link href="/admin/questions" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/admin/questions') ? "bg-slate-800/50 text-white" : "")}>
              <BookCopy className="h-5 w-5" /> Banque questions
            </Link>
            <Link href="/admin/users" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/admin/users') ? "bg-slate-800/50 text-white" : "")}>
              <Users className="h-5 w-5" /> Utilisateurs
            </Link>

            <div className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Système</div>
            
            <Link href="/admin/maintenance" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-red-900/20 text-slate-400 hover:text-red-400", pathname.startsWith('/admin/maintenance') ? "text-red-400 bg-red-900/10" : "")}>
              <Database className="h-5 w-5" /> Maintenance
            </Link>
          </>
        )}

        {/* Navigation Utilisateur */}
        {!isAdmin && (
          <>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                pathname === '/dashboard' 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Ma Progression
            </Link>

            <div className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Entraînement</div>
            
            <Link href="/dashboard/exam" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/dashboard/exam') ? "bg-slate-800/50 text-white" : "")}>
              <Trophy className="h-5 w-5" /> Simulations Examen
            </Link>
            <Link href="/dashboard/coaching" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/dashboard/coaching') ? "bg-slate-800/50 text-white" : "")}>
              <GraduationCap className="h-5 w-5" /> Programme Coaching
            </Link>
            <Link href="/dashboard/practice" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/dashboard/practice') ? "bg-slate-800/50 text-white" : "")}>
              <BookOpen className="h-5 w-5" /> Pratique Libre
            </Link>
            <Link href="/dashboard/kill-mistake-selection" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/dashboard/kill-mistake') ? "bg-slate-800/50 text-white" : "")}>
              <Brain className="h-5 w-5" /> Kill Mistake
            </Link>

            <div className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Données</div>
            
            <Link href="/dashboard/history" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 hover:text-white", pathname.startsWith('/dashboard/history') ? "bg-slate-800/50 text-white" : "")}>
              <History className="h-5 w-5" /> Historique complet
            </Link>
          </>
        )}
      </div>

      <div className="p-6 border-t border-slate-800 space-y-6 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-black text-white truncate">{profile?.firstName || 'Utilisateur'}</p>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest truncate">En ligne</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-900/10 h-12 rounded-xl font-bold" onClick={handleSignOut}>
          <LogOut className="mr-3 h-5 w-5" /> Déconnexion
        </Button>
      </div>
    </div>
  );
}
