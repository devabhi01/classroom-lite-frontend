import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, Globe, MapPin, AlignLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { institutionsApi } from '@/lib/institutions';
import { Institution } from '@/types/institution';

interface EditInstitutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution;
  onSuccess: (updated: Institution) => void;
}

export const EditInstitutionDialog: React.FC<EditInstitutionDialogProps> = ({
  isOpen,
  onClose,
  institution,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate initial values when dialog opens or institution changes
  useEffect(() => {
    if (institution) {
      setName(institution.name || '');
      setPhone(institution.phone || '');
      setEmail(institution.email || '');
      setWebsite(institution.website || '');
      setAddress(institution.address || '');
      setDescription(institution.description || '');
      setError('');
    }
  }, [institution, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Institution name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const updated = await institutionsApi.update(institution.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      });

      toast.success('Institution details updated successfully!');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update institution details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Institution Details"
      description="Update contact information, website, address, and profile description for your institution."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Institution Name */}
        <div className="space-y-1">
          <Input
            label="Institution Name"
            placeholder="e.g. ABC Institute of Technology"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Phone & Email Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Contact Email"
            type="email"
            placeholder="info@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Website URL */}
        <Input
          label="Website URL"
          type="url"
          placeholder="https://www.institution.edu"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        {/* Campus Address */}
        <Input
          label="Campus Address"
          placeholder="e.g. 123 Tech Park, Knowledge City"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Description */}
        <div className="space-y-1.5 text-left">
          <label className="block text-sm font-medium text-foreground">
            Description / Overview
          </label>
          <textarea
            rows={3}
            placeholder="Brief overview of programs, mission, and learning facilities..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
