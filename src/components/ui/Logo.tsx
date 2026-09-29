import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withLink?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  withLink = true,
}) => {
  const sizeMap = {
    sm: {
      icon: 'h-6 w-6 p-1',
      text: 'text-base font-bold',
      sub: 'text-[9px]',
    },
    md: {
      icon: 'h-8 w-8 p-1.5',
      text: 'text-lg font-bold',
      sub: 'text-[10px]',
    },
    lg: {
      icon: 'h-10 w-10 p-2',
      text: 'text-2xl font-bold',
      sub: 'text-xs',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div className={cn('flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm', currentSize.icon)}>
        <GraduationCap className="h-full w-full" />
      </div>
      <div className="flex flex-col text-left">
        <span className={cn('tracking-tight text-foreground font-semibold leading-tight', currentSize.text)}>
          TDP Classroom <span className="text-primary font-normal">Lite</span>
        </span>
        <span className={cn('font-medium uppercase tracking-wider text-muted-foreground', currentSize.sub)}>
          The Dev Pride
        </span>
      </div>
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
