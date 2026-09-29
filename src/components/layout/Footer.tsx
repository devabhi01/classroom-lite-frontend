import React from 'react';
import { Logo } from '@/components/ui/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border bg-card/60 py-6 text-sm text-muted-foreground">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Logo size="sm" withLink={false} />
          <span className="text-xs">© {new Date().getFullYear()} The Dev Pride Technology. All rights reserved.</span>
        </div>
        <div className="flex items-center space-x-6 text-xs text-muted-foreground">
          <span>Teach. Share. Learn.</span>
          <span>•</span>
          <span>Minimal & Fast Classroom</span>
        </div>
      </div>
    </footer>
  );
};
