import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  LogOut,
  Calendar,
  GraduationCap,
  Presentation,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'HOST';

  // Delete Account States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    try {
      setIsDeleting(true);
      setDeleteError('');
      await api.delete('/users/me');
      toast.success('Your account has been deleted successfully.');
      setIsDeleteOpen(false);
      logout();
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete account';
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
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

          {/* Prominent Role Badge */}
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
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border/80 p-3 bg-muted/30">
              <div className="h-9 w-9 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Session</p>
                <p className="text-sm font-medium text-foreground">Active</p>
              </div>
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

      {/* Danger Zone: Delete Account */}
      <Card className="border border-destructive/30 bg-destructive/5 shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-destructive font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Danger Zone: Delete Account</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
                Permanently delete your account, personal data, and classroom associations. If you own an institution, you must first delete it or transfer its ownership to another instructor.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteError('');
                setConfirmText('');
                setIsDeleteOpen(true);
              }}
              className="shrink-0 text-xs font-medium"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
            setDeleteError('');
            setConfirmText('');
          }
        }}
        title="Delete Account Permanently"
        description="This action cannot be undone and will permanently erase your profile and records."
      >
        <div className="space-y-4 pt-2">
          {deleteError && (
            <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Action Required
              </p>
              <p className="leading-relaxed">{deleteError}</p>
              {deleteError.toLowerCase().includes('owner') && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      navigate('/institutions');
                    }}
                    className="text-xs h-7 px-2.5 font-medium border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    Go to Institution Management
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">What will be deleted:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
              <li>Your personal profile and account credentials</li>
              <li>Your institutional memberships (as student or teacher)</li>
              <li>Your hosted classroom sessions and whiteboard drawings</li>
            </ul>
            <p className="pt-1 text-[11px] font-medium text-amber-900 dark:text-amber-200">
              Institution Owners: If you are the owner of any educational institution, you must first either delete the institution or transfer its ownership to another instructor.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              To confirm, type <span className="font-mono text-destructive font-bold">DELETE</span> below:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              disabled={isDeleting}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="text-xs"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Permanently Delete My Account
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
