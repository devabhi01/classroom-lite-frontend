import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  imageClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  withLink?: boolean;
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  imageClassName,
  size = 'md',
  iconOnly = false,
  withLink = true,
  to = '/',
}) => {
  const sizeMap = {
    sm: {
      full: 'h-6 sm:h-7',
      icon: 'h-7 w-7',
    },
    md: {
      full: 'h-8 sm:h-9',
      icon: 'h-9 w-9',
    },
    lg: {
      full: 'h-10 sm:h-12',
      icon: 'h-12 w-12',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('inline-flex items-center select-none', className)}>
      {!iconOnly ? (
        <>
          <img
            src="/logo.png"
            alt="TDP Classroom Lite"
            draggable={false}
            className={cn('block dark:hidden w-auto object-contain', currentSize.full, imageClassName)}
          />
          <img
            src="/logo-dark.png"
            alt="TDP Classroom Lite"
            draggable={false}
            className={cn('hidden dark:block w-auto object-contain', currentSize.full, imageClassName)}
          />
        </>
      ) : (
        <img
          src="/logo-icon.png"
          alt="TDP Classroom Lite"
          draggable={false}
          className={cn('object-contain', currentSize.icon, imageClassName)}
        />
      )}
      <span className="sr-only">TDP Classroom Lite</span>
    </div>
  );

  if (withLink) {
    return (
      <Link to={to} className="inline-flex items-center transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
