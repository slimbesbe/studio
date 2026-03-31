
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
  LayoutGrid,
  MessageSquare,
  BarChart3,
  ChevronDown,
  BookMarked,
  Layers,
  Globe,
  Settings2,
  User,
  ShieldCheck,
  RotateCcw,
  Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const SimuLuxLogo = ({ className = "h-8 w-32" }: { className?: string }) => (
  <div className={cn("relative shrink-0 overflow-hidden", className)}>
    <Image 
      src="https://firebasestorage.googleapis.com/v0/b/studio-8759607191-13325.firebasestorage.app/o/logo.jpg?alt=media&token=0a9404ad-6b89-4ba8-9107-916e30a167ae"
      alt="Simu-lux Logo"
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, 400px"
      priority
    />
  </div>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, profile } = useUser();
  const auth = useAuth();
  const [conceptsOpen, setConceptsOpen] = useState(pathname.includes('/concepts'));
  
  // State pour permettre à l'admin de basculer sa vision
  const [isAdminMode, setIsAdminMode] = useState(pathname.startsWith('/admin'));

  useEffect(() => {
    if (pathname.startsWith('/admin')) setIsAdminMode(true);
    if (pathname.startsWith('/dashboard')) setIsAdminMode(false);
  }, [pathname]);

  if (isUserLoading || !user || pathname === '/' || pathname === '/login' || pathname === '/access-denied') {
    return null;
  }

  const isProfileAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const toggleViewMode = () => {
    const nextMode = !isAdminMode;
    setIsAdminMode(nextMode);
    if (nextMode) {
      router.push('/admin/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const initials = profile?.firstName && profile?.lastName 
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : user?.email?.[0].toUpperCase() || '?';

  return (
    <div className="flex flex-col h-full bg-white text-slate-600 w-64 fixed left-0 top-0 z-40 border-r border-slate-100 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
      {/* Header Logo */}
      <div className="h-24 flex flex-col items-center justify-center px-6 border-b border-slate-50 bg-white">
        <Link className="flex flex-col items-center group w-full" href={isAdminMode ? "/admin/dashboard" : "/dashboard"}>
          <SimuLuxLogo className="h-12 w-full group-hover:scale-105 transition-transform" />
          <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em] mt-1">
            {isAdminMode ? 'PILOTAGE ADMIN' : 'COACH PMP'}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-8 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        
        {/* Switcher pour l'Admin */}
        {isProfileAdmin && (
          <div className="mb-6 px-2">
            <Button 
              variant="outline" 
              onClick={toggleViewMode}
              className={cn(
                "w-full justify-between h-12 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest italic transition-all shadow-sm",
                isAdminMode ? "border-indigo-100 text-indigo-600 bg-indigo-50/30" : "border-emerald-100 text-emerald-600 bg-emerald-50/30"
              )}
            >
              <div className="flex items-center gap-2">
                {isAdminMode ? <User className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {isAdminMode ? "Vision Élève" : "Vision Admin"}
              </div>
              <RotateCcw className="h-3 w-3 opacity-40" />
            </Button>
          </div>
        )}

        {!isAdminMode && (
          <>
            <div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Navigation</div>
            
            <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} />
            
            <Collapsible open={conceptsOpen} onOpenChange={setConceptsOpen} className="w-full">
              <CollapsibleTrigger asChild>
                <button className={cn(
                  "flex items-center justify-between w-full px-4 py-3 rounded-xl text-[13px] font-bold transition-all hover:bg-slate-50 group",
                  pathname.includes('/concepts') ? "text-primary bg-primary/5" : "text-slate-500"
                )}>
                  <div className="flex items-center gap-3">
                    <BookMarked className={cn("h-5 w-5", pathname.includes('/concepts') ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                    <span>Concepts de base</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", conceptsOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 ml-4 border-l-2 border-slate-50 pl-2">
                <Link href="/dashboard/concepts/approches" className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:text-primary",
                  pathname === '/dashboard/concepts/approches' ? "text-primary" : "text-slate-400"
                )}>
                  <Globe className="h-3.5 w-3.5" /> Vision Approches
                </Link>
                <Link href="/dashboard/concepts/domaines" className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:text-primary",
                  pathname === '/dashboard/concepts/domaines' ? "text-primary" : "text-slate-400"
                )}>
                  <Layers className="h-3.5 w-3.5" /> Vision Domaines
                </Link>
              </CollapsibleContent>
            </Collapsible>

            <NavItem href="/dashboard/matrice" icon={LayoutGrid} label="Matrice Magique" active={pathname === '/dashboard/matrice'} />

            <div className="px-4 mt-8 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Entraînement</div>
            <NavItem href="/dashboard/practice" icon={BookOpen} label="Pratique Libre" active={pathname === '/dashboard/practice'} />
            <NavItem href="/dashboard/exam" icon={Trophy} label="Simulation Examen" active={pathname === '/dashboard/exam'} />
            <NavItem href="/dashboard/history" icon={History} label="Historique" active={pathname === '/dashboard/history'} />

            <div className="px-4 mt-8 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Analyse</div>
            <NavItem href="/dashboard/statistics" icon={BarChart3} label="Statistiques" active={pathname === '/dashboard/statistics'} />

            <div className="px-4 mt-8 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">User</div>
            <NavItem href="/dashboard/coach" icon={MessageSquare} label="Parler au Coach" active={pathname === '/dashboard/coach' || pathname === '/dashboard/chat' || pathname === '/dashboard/message-admin'} />
          </>
        )}

        {isAdminMode && (
          <>
            <div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Pilotage Admin</div>
            <NavItem href="/admin/dashboard" icon={LayoutDashboard} label="Cockpit Admin" active={pathname === '/admin/dashboard'} />
            <NavItem href="/admin/content-config" icon={Settings2} label="Configuration contenu" active={pathname.startsWith('/admin/content-config')} />
            <NavItem href="/admin/coaching" icon={GraduationCap} label="Sessions Coaching" active={pathname.startsWith('/admin/coaching')} />
            <NavItem href="/admin/questions" icon={BookCopy} label="Banque Questions" active={pathname.startsWith('/admin/questions')} />
            <NavItem href="/admin/messages" icon={Inbox} label="Boîte Messages" active={pathname.startsWith('/admin/messages')} />
            <NavItem href="/admin/users" icon={Users} label="Utilisateurs" active={pathname.startsWith('/admin/users')} />
            <div className="pt-4">
              <NavItem href="/admin/maintenance" icon={Database} label="Maintenance" active={pathname.startsWith('/admin/maintenance')} />
            </div>
          </>
        )}
      </div>

      {/* Profile & Logout */}
      <div className="p-6 border-t border-slate-50 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black bg-gradient-to-br from-primary to-accent shadow-lg italic">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black text-slate-900 truncate italic leading-tight">{profile?.firstName || 'Utilisateur'}</p>
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest truncate mt-1">
              {isProfileAdmin ? 'Administrateur' : 'Prêt pour le PMP'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-50 h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-4 w-4" /> Déconnexion
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
        "flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all group",
        active 
          ? "bg-primary/5 text-primary shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
      {label}
    </Link>
  );
}
