import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  PlusCircle,
  LogIn,
  LayoutDashboard,
  Sparkles,
  ChevronDown,
  GraduationCap,
  Presentation,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const demoDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (demoDropdownRef.current && !demoDropdownRef.current.contains(event.target as Node)) {
        setDemoDropdownOpen(false);
      }
    };
    if (demoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [demoDropdownOpen]);

  const handleSelectDemo = (role: 'STUDENT' | 'HOST') => {
    loginAsDemo(role);
    setDemoDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/classroom/DEMO101');
  };

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

          {/* Try Demo Dropdown (Only visible when NOT logged in) */}
          {!isAuthenticated && (
            <div className="relative" ref={demoDropdownRef}>
              <button
                type="button"
                onClick={() => setDemoDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none"
                aria-expanded={demoDropdownOpen}
                aria-haspopup="true"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Try Demo</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    demoDropdownOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                  }`}
                />
              </button>

              {demoDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Interactive Demo Mode
                  </div>

                  {/* For Student */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('STUDENT')}
                    className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left hover:bg-muted/80 transition-colors group cursor-pointer"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        For Student
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug">
                        Synchronized presentation, whiteboard, & full-screen
                      </span>
                    </div>
                  </button>

                  {/* For Teacher */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('HOST')}
                    className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left hover:bg-muted/80 transition-colors group cursor-pointer mt-0.5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Presentation className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        For Teacher
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug">
                        Host controls, slide sharing, annotations, & room management
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

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

            {/* Try Demo Options on Mobile (Only visible when NOT logged in) */}
            {!isAuthenticated && (
              <div className="py-2 border-y border-border/60 my-1 space-y-1">
                <div className="px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Try Demo</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('STUDENT')}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md text-left transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-600">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">For Student</span>
                    <span className="text-[11px] text-muted-foreground">Follow slides, whiteboard, & full-screen</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('HOST')}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md text-left transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <Presentation className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">For Teacher</span>
                    <span className="text-[11px] text-muted-foreground">Host controls, slide tools, & screen share</span>
                  </div>
                </button>
              </div>
            )}

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
