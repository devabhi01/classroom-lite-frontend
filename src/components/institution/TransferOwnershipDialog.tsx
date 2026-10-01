import React, { useState } from 'react';
import { ShieldAlert, UserCheck, AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { institutionsApi } from '@/lib/institutions';
import { Institution, InstitutionMembership } from '@/types/institution';

interface TransferOwnershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution;
  eligibleTeachers: InstitutionMembership[];
  onSuccess: () => void;
}

export const TransferOwnershipDialog: React.FC<TransferOwnershipDialogProps> = ({
  isOpen,
  onClose,
  institution,
  eligibleTeachers,
  onSuccess,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError('Please select an instructor to transfer ownership to');
      return;
    }

    const selectedTeacher = eligibleTeachers.find(
      (t) => (t.userId || t.user?.id) === selectedTeacherId,
    );
    const teacherName = selectedTeacher?.user?.name || 'the selected instructor';

    if (
      !window.confirm(
        `Are you absolutely sure you want to transfer ownership of "${institution.name}" to ${teacherName}? You will step down as Owner.`,
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await institutionsApi.transferOwnership(institution.id, selectedTeacherId);
      toast.success(`Ownership transferred successfully to ${teacherName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Institution Ownership"
      description={`Hand over primary owner rights of ${institution.name} to another verified instructor.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Important Notice</span>
          </div>
          <p className="leading-relaxed">
            Only verified teachers or administrators can take ownership of an educational institution. Once transferred, you will become a standard instructor member and the new owner will possess full administration rights.
          </p>
        </div>

        {eligibleTeachers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">No other instructors found</p>
            <p>
              There are currently no other teachers or administrators accepted in this institution. You can invite other teachers to join first using your invite code.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Select New Owner (Instructor)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
              {eligibleTeachers.map((t) => {
                const targetId = t.userId || t.user?.id || '';
                const isSelected = selectedTeacherId === targetId;

                return (
                  <label
                    key={targetId}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="newOwner"
                        value={targetId}
                        checked={isSelected}
                        onChange={() => setSelectedTeacherId(targetId)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <div className="text-xs font-semibold">{t.user?.name || 'Instructor'}</div>
                        <div className="text-[11px] text-muted-foreground">{t.user?.email}</div>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {t.role}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={isLoading || eligibleTeachers.length === 0 || !selectedTeacherId}
            isLoading={isLoading}
          >
            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
            Confirm Transfer
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
