
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShieldCheck, GraduationCap, Zap, Trophy, ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-pmp');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight text-primary">INOVEXIO <span className="text-accent">PMP</span></span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Fonctionnalités
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
            Se connecter
          </Link>
          <Button asChild variant="default" size="sm" className="hidden sm:flex">
            <Link href="/login">Demander un accès</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-white to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
              <div className="flex flex-col justify-center space-y-4 animate-slide-up">
                <div className="inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">
                  Propulsé par INOVEXIO Consulting
                </div>
                <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-foreground">
                  Maîtrisez le PMP avec le Simulateur <span className="text-primary">INOVEXIO</span>
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
                  Une plateforme d'entraînement réaliste conçue pour les futurs chefs de projet certifiés. Mindset PMI, analyse d'erreurs "Kill Mistakes" et suivi personnalisé.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row pt-4">
                  <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20">
                    <Link href="/login">
                      Commencer l'entraînement <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="px-8">
                    Découvrir nos offres
                  </Button>
                </div>
              </div>
              <div className="relative group animate-fade-in">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <Image
                  alt="PMP Simulation Dashboard"
                  className="relative mx-auto aspect-video overflow-hidden rounded-2xl object-cover object-center shadow-2xl"
                  src={heroImage?.imageUrl || ""}
                  width={1200}
                  height={800}
                  data-ai-hint="project management"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl text-primary">
                Pourquoi choisir INOVEXIO ?
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Notre approche pédagogique est centrée sur l'élimination systématique de vos lacunes.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="group p-6 bg-background rounded-xl hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold mb-2">Simulation Réaliste</h3>
                <p className="text-muted-foreground text-sm">
                  180 questions chronométrées, conformes au dernier ECO (Exam Content Outline).
                </p>
              </div>
              <div className="group p-6 bg-background rounded-xl hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/10">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-headline font-bold mb-2">Kill Mistakes</h3>
                <p className="text-muted-foreground text-sm">
                  Un système de répétition espacée intelligent pour ne plus jamais rater la même question.
                </p>
              </div>
              <div className="group p-6 bg-background rounded-xl hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold mb-2">Analytique Avancée</h3>
                <p className="text-muted-foreground text-sm">
                  Score détaillé par domaine, approche et groupe de processus.
                </p>
              </div>
              <div className="group p-6 bg-background rounded-xl hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/10">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-headline font-bold mb-2">Mindset PMI</h3>
                <p className="text-muted-foreground text-sm">
                  Explications détaillées pour chaque choix, ancrant durablement la philosophie PMI.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 bg-primary text-white">
        <div className="container px-4 md:px-6 mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-medium">
            © 2024 INOVEXIO Consulting. Tous droits réservés.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-sm hover:underline underline-offset-4" href="#">
              Mentions Légales
            </Link>
            <Link className="text-sm hover:underline underline-offset-4" href="#">
              RGPD
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
