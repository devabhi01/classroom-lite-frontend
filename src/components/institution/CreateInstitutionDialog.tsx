import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { institutionsApi } from '@/lib/institutions';

interface CreateInstitutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateInstitutionDialog: React.FC<CreateInstitutionDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an institution name');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const created = await institutionsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
      });
      toast.success(`Institution "${created.name}" created with code: ${created.code}!`);
      setName('');
      setDescription('');
      setWebsite('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create institution');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Institution"
      description="Start an institution as Owner to host classrooms and manage teachers and students."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <Input
          label="Institution Name"
          placeholder="e.g. Apex Computer Academy"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          autoFocus
          required
        />

        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-medium text-foreground">Description (Optional)</label>
          <textarea
            rows={3}
            placeholder="Brief overview of your institution or curriculum..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <Input
          label="Website URL (Optional)"
          placeholder="https://example.com"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading}>
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Create Institution
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
