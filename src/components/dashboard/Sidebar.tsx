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
      <linearGradient id="shieldGrad" x1="0" x2="1" x2="1">
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
  // Vérification de rôle admin stricte
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
    <div className="flex flex-col h-full bg-white text-slate-600 w-64 fixed left-0 top-0 z-40 shadow-sm border-r border-slate-100">
      {/* Header Logo */}
      <div className="h-24 flex items-center px-8 border-b border-slate-50 bg-white">
        <Link className="flex items-center gap-3 group" href={isAdmin ? "/admin/dashboard" : "/dashboard"}>
          <div className="bg-primary/5 p-2 rounded-2xl group-hover:scale-105 transition-transform text-primary">
            <SimuLuxLogo className="h-9 w-9" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl italic tracking-tighter text-slate-900 leading-none">Simu-lux</span>
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1.5">{isAdmin ? 'PILOTAGE' : 'ESPACE ÉLÈVE'}</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-8 px-5 space-y-1.5 overflow-y-auto bg-white">
        {/* Navigation Admin (Visible uniquement pour les admins) */}
        {isAdmin && (
          <>
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black italic uppercase transition-all",
                pathname === '/admin/dashboard' 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Cockpit Admin
            </Link>

            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black italic uppercase transition-all mt-2 border-2 border-dashed border-slate-100",
                pathname === '/dashboard' 
                  ? "bg-slate-50 text-indigo-600 border-indigo-100" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <User className="h-5 w-5" />
              Vue Élève
            </Link>

            <div className="pt-8 pb-3 px-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Pilotage</div>
            
            <NavItem href="/admin/coaching" icon={GraduationCap} label="COACHING & GROUPES" active={pathname.startsWith('/admin/coaching')} />
            <NavItem href="/admin/questions" icon={BookCopy} label="BANQUE QUESTIONS" active={pathname.startsWith('/admin/questions')} />
            <NavItem href="/admin/users" icon={Users} label="UTILISATEURS" active={pathname.startsWith('/admin/users')} />

            <div className="pt-8 pb-3 px-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Maintenance</div>
            
            <Link href="/admin/maintenance" className={cn("flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black italic uppercase transition-all hover:bg-red-50 text-slate-400 hover:text-red-600", pathname.startsWith('/admin/maintenance') ? "text-red-600 bg-red-50" : "")}>
              <Database className="h-5 w-5" /> Maintenance
            </Link>
          </>
        )}

        {/* Navigation Utilisateur (Elève) */}
        {!isAdmin && (
          <>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black italic uppercase transition-all",
                pathname === '/dashboard' 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Ma Progression
            </Link>

            <div className="pt-8 pb-3 px-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Entraînement</div>
            
            <NavItem href="/dashboard/exam" icon={Trophy} label="SIMULATIONS EXAMEN" active={pathname.startsWith('/dashboard/exam')} />
            <NavItem href="/dashboard/coaching" icon={GraduationCap} label="PROGRAMME COACHING" active={pathname.startsWith('/dashboard/coaching')} />
            <NavItem href="/dashboard/practice" icon={BookOpen} label="PRATIQUE LIBRE" active={pathname.startsWith('/dashboard/practice')} />
            <NavItem href="/dashboard/kill-mistake-selection" icon={Brain} label="KILL MISTAKE" active={pathname.startsWith('/dashboard/kill-mistake')} />

            <div className="pt-8 pb-3 px-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Données</div>
            
            <NavItem href="/dashboard/history" icon={History} label="HISTORIQUE COMPLET" active={pathname.startsWith('/dashboard/history')} />
          </>
        )}
      </div>

      {/* Profile & Logout */}
      <div className="p-8 border-t border-slate-50 space-y-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black bg-gradient-to-br from-primary to-indigo-600 shadow-lg text-lg italic">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-black text-slate-900 truncate italic leading-tight">{profile?.firstName || 'Utilisateur'}</p>
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest truncate mt-0.5">Session Active</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-red-600 hover:bg-red-50 h-12 rounded-2xl font-black uppercase text-[11px] italic tracking-widest transition-all" onClick={handleSignOut}>
          <LogOut className="mr-3 h-5 w-5" /> Déconnexion
        </Button>
      </div>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-black italic uppercase transition-all group",
        active 
          ? "bg-primary/5 text-primary" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-primary" : "text-slate-300 group-hover:text-slate-600")} />
        {label}
      </div>
      {active && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
    </Link>
  );
}
