
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookCopy, 
  BarChart3, 
  Download, 
  UserPlus,
  ArrowUpRight,
  Search,
  MoreVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const MOCK_USERS = [
  { name: 'Jean Dupont', email: 'jean@inovexio.com', status: 'Actif', progress: '68%', lastActive: 'Il y a 2h' },
  { name: 'Marie Curie', email: 'marie@inovexio.com', status: 'Actif', progress: '92%', lastActive: 'Aujourd\'hui' },
  { name: 'Pierre Simon', email: 'pierre@inovexio.com', status: 'Inactif', progress: '12%', lastActive: 'Il y a 5j' },
];

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-fade-in p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Super Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Gérez vos utilisateurs, questions et analysez les performances globales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exporter CSV</Button>
          <Button><UserPlus className="mr-2 h-4 w-4" /> Nouvel Utilisateur</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Totaux</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-emerald-600 font-medium flex items-center mt-1">
              +48 ce mois <ArrowUpRight className="h-3 w-3 ml-1" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Banque de Questions</CardTitle>
            <BookCopy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,500</div>
            <p className="text-xs text-muted-foreground mt-1">98% validées par formateur</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Examens Passés</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground mt-1">Derniers 30 jours : 842</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux Réussite Moyen</CardTitle>
            <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">74%</div>
            <p className="text-xs text-muted-foreground mt-1">Seuil recommandé : 80%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Utilisateurs Récents</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-8 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Dernière Activité</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_USERS.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Actif' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.progress}</TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Domaines Faibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Gestion des Risques', value: 42, color: 'bg-red-500' },
              { label: 'Gestion de l\'Approvisionnement', value: 55, color: 'bg-amber-500' },
              { label: 'Gestion des Ressources', value: 61, color: 'bg-amber-400' },
              { label: 'Gouvernance du Projet', value: 68, color: 'bg-primary' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">Voir rapport détaillé</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
