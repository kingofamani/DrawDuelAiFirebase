'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Edit3 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary/30">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-primary mb-4 tracking-tight">
          Draw Duel AI
        </h1>
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Engage in exciting real-time drawing battles and let AI be the judge!
          Teachers create games, students join the challenge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Link href="/teacher" passHref className="w-full">
          <Button
            variant="default"
            size="lg"
            className="w-full h-32 text-lg py-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center bg-primary hover:bg-primary/90"
          >
            <Users className="w-12 h-12 mb-2 text-primary-foreground" />
            <span className="text-primary-foreground">I'm a Teacher</span>
          </Button>
        </Link>
        <Link href="/student" passHref className="w-full">
          <Button
            variant="default"
            size="lg"
            className="w-full h-32 text-lg py-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center bg-accent hover:bg-accent/90"
          >
            <Edit3 className="w-12 h-12 mb-2 text-accent-foreground" />
            <span className="text-accent-foreground">I'm a Student</span>
          </Button>
        </Link>
      </div>

      <footer className="mt-16 text-center text-foreground/60 text-sm">
        <p>&copy; {new Date().getFullYear()} Draw Duel AI. Unleash your creativity!</p>
      </footer>
    </main>
  );
}
