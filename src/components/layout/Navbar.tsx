import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  PlusCircle,
  LogIn,
  LayoutDashboard,
  Building2,
  BarChart3,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const isStudent = user?.role === 'STUDENT';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Logo size="md" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            to="/"
            className={`transition-colors hover:text-primary ${
              isActive('/') ? 'text-primary font-semibold' : 'text-muted-foreground'
            }`}
          >
            Home
          </Link>
          <a
            href="/#about"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            About
          </a>

          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`transition-colors hover:text-primary ${
                  isActive('/dashboard') ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/institutions"
                className={`transition-colors hover:text-primary ${
                  isActive('/institutions') || location.pathname.startsWith('/institutions/')
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                Institutions
              </Link>
              <Link
                to="/analytics"
                className={`transition-colors hover:text-primary ${
                  isActive('/analytics') ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                Analytics
              </Link>
              {!isStudent && (
                <Link
                  to="/create-classroom"
                  className={`transition-colors hover:text-primary ${
                    isActive('/create-classroom') ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  Create
                </Link>
              )}
              <Link
                to="/join-classroom"
                className={`transition-colors hover:text-primary ${
                  isActive('/join-classroom') ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                Join
              </Link>
            </>
          )}
        </nav>

        {/* Desktop Auth / Action Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/profile"
                className="flex items-center space-x-2 text-sm text-foreground hover:opacity-80 transition-opacity"
              >
                <Avatar name={user.name} size="sm" src={user.avatar} />
                <div className="flex flex-col text-left">
                  <span className="font-medium max-w-[120px] truncate leading-tight">{user.name}</span>
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      user.role === 'TEACHER' || user.role === 'HOST'
                        ? 'text-primary'
                        : 'text-emerald-600'
                    }`}
                  >
                    {user.role === 'TEACHER' || user.role === 'HOST' ? 'Teacher' : 'Student'}
                  </span>
                </div>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">
                  Signup
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
            >
              Home
            </Link>
            <a
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
            >
              About
            </a>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  Dashboard
                </Link>
                <Link
                  to="/institutions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Institutions
                </Link>
                <Link
                  to="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Analytics
                </Link>
                {!isStudent && (
                  <Link
                    to="/create-classroom"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                  >
                    <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    Create Classroom
                  </Link>
                )}
                <Link
                  to="/join-classroom"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                  Join Classroom
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Profile ({user.name})</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      user.role === 'TEACHER' || user.role === 'HOST'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    {user.role === 'TEACHER' || user.role === 'HOST' ? 'Teacher' : 'Student'}
                  </span>
                </Link>
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full justify-center"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    Login
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center">
                    Signup
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
