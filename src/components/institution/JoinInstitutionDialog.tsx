import React, { useState } from 'react';
import { Building2, KeyRound } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { institutionsApi } from '@/lib/institutions';
import { useAuth } from '@/hooks/useAuth';

interface JoinInstitutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinInstitutionDialog: React.FC<JoinInstitutionDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(
    user?.role === 'TEACHER' ? 'TEACHER' : 'STUDENT'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a valid institution code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await institutionsApi.joinByCode(code.trim().toUpperCase(), role);
      toast.success(`Join request sent for institution code: ${code.trim().toUpperCase()}`);
      setCode('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit join request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Join Institution"
      description="Enter the unique institution code provided by your school or organization."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Input
            label="Institution Code"
            placeholder="e.g. TDP82K4"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            className="font-mono uppercase tracking-wider"
            autoFocus
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Unique 7-character code assigned to the institution.
          </p>
        </div>

        {user?.role === 'TEACHER' && (
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-medium text-foreground">Requested Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('TEACHER')}
                className={`py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                  role === 'TEACHER'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                  role === 'STUDENT'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                Student
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Send Join Request
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
