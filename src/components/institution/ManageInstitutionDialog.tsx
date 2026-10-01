import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Copy,
  Check,
  UserCheck,
  UserX,
  Clock,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/utils';
import { institutionsApi } from '@/lib/institutions';
import {
  Institution,
  InstitutionMembership,
  InstitutionStats,
} from '@/types/institution';

interface ManageInstitutionDialogProps {
  institution: Institution | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ManageInstitutionDialog: React.FC<ManageInstitutionDialogProps> = ({
  institution,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'members' | 'stats'>('requests');
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  const [requests, setRequests] = useState<InstitutionMembership[]>([]);
  const [members, setMembers] = useState<InstitutionMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!institution) return;
    try {
      setIsLoading(true);
      const [statsData, requestsData, membersData] = await Promise.all([
        institutionsApi.getStats(institution.id).catch(() => null),
        institutionsApi.getRequests(institution.id).catch(() => []),
        institutionsApi.getMembers(institution.id).catch(() => []),
      ]);
      setStats(statsData);
      setRequests(requestsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load institution management data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && institution) {
      loadData();
    }
  }, [isOpen, institution]);

  const handleCopyCode = async () => {
    if (!institution) return;
    const success = await copyToClipboard(institution.code);
    if (success) {
      setIsCopied(true);
      toast.success(`Copied institution code: ${institution.code}`);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    if (!institution) return;
    try {
      setActionLoadingId(userId);
      await institutionsApi.acceptRequest(institution.id, userId);
      toast.success('Member join request accepted!');
      await loadData();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (userId: string) => {
    if (!institution) return;
    try {
      setActionLoadingId(userId);
      await institutionsApi.rejectRequest(institution.id, userId);
      toast.info('Member join request rejected.');
      await loadData();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!institution) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={institution.name}
      description="Manage institution membership requests, members, and details."
      className="max-w-2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Header Bar with Code & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/40">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Institution Code:
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-lg font-bold tracking-wider text-primary">
                {institution.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
                title="Copy code"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center">
                <span className="text-muted-foreground block text-[10px]">Members</span>
                <span className="font-bold text-foreground">{stats.totalMembers}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block text-[10px]">Teachers</span>
                <span className="font-bold text-foreground">{stats.totalTeachers}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block text-[10px]">Students</span>
                <span className="font-bold text-foreground">{stats.totalStudents}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block text-[10px]">Classrooms</span>
                <span className="font-bold text-foreground">{stats.totalClassrooms}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'requests'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Join Requests</span>
            {requests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Members ({members.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading details...</div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4">
                No pending join requests for this institution.
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {req.user?.name || 'Applicant'}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {req.role}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{req.user?.email}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(req.userId)}
                      isLoading={actionLoadingId === req.userId}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(req.userId)}
                      isLoading={actionLoadingId === req.userId}
                      className="h-7 text-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No members found.
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                >
                  <div>
                    <div className="font-medium text-xs text-foreground">{m.user?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.user?.email}</div>
                  </div>
                  <Badge
                    variant={m.role === 'OWNER' ? 'default' : m.role === 'ADMIN' ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {m.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
