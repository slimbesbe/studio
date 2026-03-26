"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookCopy, 
  Loader2,
  ArrowRight,
  BarChart3,
  GraduationCap,
  ShieldCheck,
  Database,
  TrendingUp,
  Activity,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronUp,
  MoreHorizontal,
  Search,
  Pencil,
  Trash2,
  Info
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadialBarChart, RadialBar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperAdminDashboard() {
  const { profile, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [profile, isUserLoading, router]);

  const activityData = [
    { name: 'Lun', val: 2400 },
    { name: 'Mar', val: 1398 },
    { name: 'Mer', val: 9800 },
    { name: 'Jeu', val: 3908 },
    { name: 'Ven', val: 4800 },
    { name: 'Sam', val: 3800 },
    { name: 'Dim', val: 4300 },
  ];

  const monthlySimData = [
    { month: 'Jan', val: 45000 },
    { month: 'Fév', val: 52000 },
    { month: 'Mar', val: 48000 },
    { month: 'Avr', val: 61000 },
    { month: 'Mai', val: 55000 },
    { month: 'Juin', val: 75000 },
  ];

  const groupData = [
    { name: 'PMP Masterclass A', coach: 'M. Dupont', members: 450, prog: 82, score: 82.6, date: '20 Mar 2023' },
    { name: 'Formation B2B Orange', coach: 'S. Besbes', members: 75, prog: 95, score: 93.8, date: '21 Mar 2023' },
    { name: 'Agile Squad 2024', coach: 'L. Martin', members: 75, prog: 90, score: 93.7, date: '28 Mar 2023' },
    { name: 'Certification Express', coach: 'J. Doe', members: 15, prog: 65, score: 83.5, date: '20 Mar 2023' },
    { name: 'Session Étudiants', coach: 'A. Bernard', members: 15, prog: 40, score: 78.5, date: '20 Mar 2023' },
  ];

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-8 space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Tableau de Bord Super Admin</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Contrôle centralisé de la plateforme Simu-lux</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white border-none shadow-sm rounded-xl font-bold h-11 px-6">
            <Search className="h-4 w-4 mr-2" /> Rechercher...
          </Button>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg"><Activity className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg"><Clock className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative"><Activity className="h-4 w-4" /><span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. Vue d'ensemble */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 space-y-6 h-full">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <OverviewCard icon={Users} label="Users actifs" val="12,500" color="bg-blue-50 text-blue-600" />
              <OverviewCard icon={LayoutGrid} label="Groupes actifs" val="450" color="bg-emerald-50 text-emerald-600" />
              <OverviewCard icon={GraduationCap} label="Coaches actifs" val="150" color="bg-indigo-50 text-indigo-600" />
              <OverviewCard icon={Briefcase} label="Partners actifs" val="25" color="bg-amber-50 text-amber-600" />
            </div>
            
            {/* 4. Gestion */}
            <div className="pt-6 border-t border-slate-50 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">4. Gestion</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase">Comptes expirés</p>
                  <p className="text-3xl font-black text-red-600 tracking-tighter">120</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-400 uppercase">Comptes suspendus</p>
                  <p className="text-3xl font-black text-amber-600 tracking-tighter">45</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Activité */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">2. Activité</h3>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Simulations aujourd'hui</p>
                  <p className="text-2xl font-black text-slate-900">3,200</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData.slice(0, 5)}>
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Simulations ce mois</p>
                  <p className="text-2xl font-black text-slate-900">75,000</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlySimData}>
                      <Line type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">Temps d'étude global</p>
                <div className="relative h-24 w-24 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="251.3" strokeDashoffset="60" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-black text-slate-900">15,000</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">hrs</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">Questions traitées globalement</p>
                <p className="text-2xl font-black text-slate-900">2.5 Million</p>
                <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
                  <ChevronUp className="h-3 w-3" /> +12% vs mois dernier
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Performance */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">3. Performance</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <GaugeCard label="Score moyen global" val={82} color="#3b82f6" />
              <GaugeCard label="Taux de réussite" val={78} color="#10b981" />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">Progression moyenne par groupe</p>
              <div className="h-20 w-full flex items-end gap-1">
                {[40, 65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group" style={{ height: `${h}%` }}>
                    <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-50">
              <div className="bg-red-50/50 p-4 rounded-2xl flex justify-between items-center border border-red-100">
                <p className="text-[10px] font-black text-red-600 uppercase">Groupes sans coach</p>
                <p className="text-xl font-black text-red-600">15</p>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-amber-600 uppercase">Groupes proches saturation</p>
                  <p className="text-xl font-black text-amber-600">22</p>
                </div>
                <div className="h-1.5 w-full bg-amber-200/30 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[85%] rounded-full" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Business */}
        <div className="md:col-span-5">
          <Card className="rounded-[24px] border-none shadow-sm p-8 h-full space-y-8">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">5. Business</h3>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Licences B2B vendues</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">5,000</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <Bar dataKey="val" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Licences utilisées</p>
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle cx="64" cy="64" r="50" stroke="#3b82f6" strokeWidth="12" fill="transparent" strokeDasharray="314.15" strokeDashoffset="75" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-slate-900">3,800</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase italic">Utilisation %</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">Nouveaux clients</p>
                <div className="flex items-end gap-4">
                  <p className="text-2xl font-black text-slate-900">120</p>
                  <div className="h-8 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySimData}>
                        <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">Abonnements actifs</p>
                <div className="flex items-end gap-4">
                  <p className="text-2xl font-black text-slate-900">4,100</p>
                  <div className="h-8 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySimData}>
                        <Line type="step" dataKey="val" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 6. Analyse Groupe */}
        <div className="md:col-span-7">
          <Card className="rounded-[24px] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">6. Analyse groupe</h3>
              <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600">Voir tout</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400">Nom du Groupe</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400">Coach</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center">Membres</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400">Progression</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center">Score Moy.</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupData.map((g, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="font-bold text-blue-600 text-xs italic">{g.name}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-600">{g.coach}</TableCell>
                      <TableCell className="text-center text-xs font-bold text-slate-900">{g.members}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${g.prog}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{g.prog}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-xs">{g.score}%</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, val, color }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function GaugeCard({ label, val, color }: any) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase text-center">{label}</p>
      <div className="relative h-24 w-32 flex items-center justify-center overflow-hidden">
        <svg className="absolute top-0 transform" width="120" height="120">
          <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset="0" strokeLinecap="round" transform="rotate(180 60 60)" />
          <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset={157 - (157 * val) / 100} strokeLinecap="round" transform="rotate(180 60 60)" />
        </svg>
        <span className="mt-6 text-2xl font-black text-slate-900">{val}%</span>
      </div>
    </div>
  );
}
