import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  LogOut,
  Calendar,
  GraduationCap,
  Presentation,
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'HOST';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="border border-border/80 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            <Avatar
              name={user?.name}
              src={user?.avatar}
              size="lg"
              className="h-20 w-20 text-2xl border-2 border-primary/20 shadow-sm"
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{user?.name || 'Classroom User'}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{user?.email}</CardDescription>

          {/* Prominent Permanent Role Badge */}
          <div className="mt-3 flex items-center justify-center">
            {isTeacher ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Presentation className="h-3.5 w-3.5" />
                Teacher (Host)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
                <GraduationCap className="h-3.5 w-3.5" />
                Student (Learner)
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 border-t border-border">
          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 rounded-lg border border-border/80 p-3 bg-muted/30">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border/80 p-3 bg-muted/30">
              <div className="h-9 w-9 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border/80 p-3 bg-muted/30">
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center ${
                  isTeacher ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'
                }`}
              >
                {isTeacher ? <Presentation className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Account Role</p>
                <p className="text-sm font-semibold text-foreground">
                  {isTeacher ? 'Teacher / Host' : 'Student / Learner'}
                </p>
                <p className="text-[10px] text-muted-foreground">Permanent (Set at signup)</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border/80 p-3 bg-muted/30">
              <div className="h-9 w-9 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Session</p>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-[10px] text-muted-foreground">Authenticated via JWT</p>
              </div>
            </div>
          </div>

          {/* Account Role Policy Info Note */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-start space-x-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-foreground">Account Role Policy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your role is permanently assigned as <strong className="text-foreground">{isTeacher ? 'Teacher (Host)' : 'Student (Learner)'}</strong> based on your selection during signup. For classroom security and permission integrity, account roles cannot be changed.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border pt-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>

          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
