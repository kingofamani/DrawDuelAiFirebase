import type { ReactNode } from 'react';

interface PageWrapperProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ title, children, className }: PageWrapperProps) {
  return (
    <div className={`flex flex-col w-full h-full flex-grow ${className || ''}`}>
      {title && (
        <header className="p-4 sm:p-6 bg-card shadow-sm sticky top-0 z-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">{title}</h1>
        </header>
      )}
      <main className="flex-grow flex flex-col p-2 sm:p-4 overflow-auto">
        {children}
      </main>
    </div>
  );
}
