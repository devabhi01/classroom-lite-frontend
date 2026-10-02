import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Presentation,
  PlusCircle,
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit3,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { institutionsApi } from '@/lib/institutions';
import {
  Institution,
  InstitutionMembership,
  InstitutionStats,
} from '@/types/institution';
import { Classroom } from '@/types/classroom';
import { CreateInstitutionDialog } from '@/components/institution/CreateInstitutionDialog';
import { JoinInstitutionDialog } from '@/components/institution/JoinInstitutionDialog';
import { EditInstitutionDialog } from '@/components/institution/EditInstitutionDialog';
import { TransferOwnershipDialog } from '@/components/institution/TransferOwnershipDialog';

export const InstitutionManagement: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myInstitutions, setMyInstitutions] = useState<InstitutionMembership[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [currentMembership, setCurrentMembership] = useState<InstitutionMembership | null>(null);

  const [activeTab, setActiveTab] = useState<'requests' | 'members' | 'classrooms' | 'about'>('about');
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  const [requests, setRequests] = useState<InstitutionMembership[]>([]);
  const [members, setMembers] = useState<InstitutionMembership[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search & Filter States
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');
  const [requestRoleFilter, setRequestRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');

  // Dialog modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Public explore / search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Institution[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [joiningInstId, setJoiningInstId] = useState<string | null>(null);

  // Fetch all user's institutions
  const fetchMyInstitutions = useCallback(async () => {
    try {
      setIsLoading(true);
      const memberships = await institutionsApi.getMy();
      setMyInstitutions(memberships);

      if (memberships.length > 0) {
        let targetMembership = memberships[0];
        if (id) {
          const match = memberships.find((m) => m.institutionId === id || m.institution?.id === id || m.id === id);
          if (match) targetMembership = match;
        }

        const inst: Institution = targetMembership.institution || {
          id: targetMembership.institutionId || targetMembership.id,
          name: (targetMembership as any).name || 'Institution',
          code: (targetMembership as any).code || '',
          description: (targetMembership as any).description || null,
          logo: (targetMembership as any).logo || null,
          email: (targetMembership as any).email || null,
          phone: (targetMembership as any).phone || null,
          address: (targetMembership as any).address || null,
          website: (targetMembership as any).website || null,
          ownerId: (targetMembership as any).ownerId || '',
          status: 'ACTIVE',
          createdAt: targetMembership.createdAt || new Date().toISOString(),
          updatedAt: targetMembership.updatedAt || new Date().toISOString(),
        };

        setSelectedInstitution(inst);
        setCurrentMembership(targetMembership);

        // Fetch full profile in background
        if (inst.id) {
          institutionsApi.getById(inst.id).then((fullInst) => {
            if (fullInst) {
              setSelectedInstitution((prev) => ({ ...(prev || {}), ...fullInst }));
            }
          }).catch(() => { });
        }
      } else {
        setSelectedInstitution(null);
        setCurrentMembership(null);
        // Load initial public institutions
        institutionsApi.search('').then(setSearchResults).catch(() => { });
      }
    } catch (err: any) {
      console.error('Failed to load institutions:', err);
      toast.error('Failed to load your institutions');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMyInstitutions();
  }, [fetchMyInstitutions]);

  // Load details for selected institution
  const loadInstitutionDetails = useCallback(async (instId: string) => {
    try {
      setIsLoadingDetails(true);
      const isStudent = user?.role === 'STUDENT' || currentMembership?.role === 'STUDENT';

      if (isStudent) {
        // Students only load institution profile and their classrooms
        const [fullInst, classroomsData] = await Promise.all([
          institutionsApi.getById(instId).catch(() => null),
          institutionsApi.getClassrooms(instId).catch(() => []),
        ]);

        if (fullInst) {
          setSelectedInstitution((prev) => ({ ...(prev || {}), ...fullInst }));
        }
        setClassrooms(classroomsData);
        setRequests([]);
        setMembers([]);
        setStats(null);
      } else {
        // Staff/Admin load full stats, requests, members, and classrooms
        const [fullInst, statsData, requestsData, membersData, classroomsData] = await Promise.all([
          institutionsApi.getById(instId).catch(() => null),
          institutionsApi.getStats(instId).catch(() => null),
          institutionsApi.getRequests(instId).catch(() => []),
          institutionsApi.getMembers(instId).catch(() => []),
          institutionsApi.getClassrooms(instId).catch(() => []),
        ]);

        if (fullInst) {
          setSelectedInstitution((prev) => ({ ...(prev || {}), ...fullInst }));
        }
        setStats(statsData);
        setRequests(requestsData);
        setMembers(membersData);
        setClassrooms(classroomsData);
      }
    } catch (err: any) {
      console.error('Failed to load institution details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [user?.role, currentMembership?.role]);

  useEffect(() => {
    if (selectedInstitution?.id) {
      loadInstitutionDetails(selectedInstitution.id);
    }
  }, [selectedInstitution?.id, loadInstitutionDetails]);

  // Handle Switch Institution
  const handleSelectInstitution = (inst: Institution, membership: InstitutionMembership) => {
    setSelectedInstitution(inst);
    setCurrentMembership(membership);
    navigate(`/institutions/${inst.id}`);
  };

  // Handle Search Public Institutions
  const handleSearchInstitutions = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      institutionsApi.search('').then(setSearchResults).catch(() => { });
      return;
    }
    try {
      setIsSearching(true);
      const results = await institutionsApi.search(q);
      setSearchResults(results);
    } catch {
      // Ignore
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Direct Join by Institution ID from Search
  const handleJoinById = async (targetId: string, instName: string) => {
    try {
      setJoiningInstId(targetId);
      await institutionsApi.joinById(targetId, user?.role === 'TEACHER' ? 'TEACHER' : 'STUDENT');
      toast.success(`Join request sent to ${instName}!`);
      await fetchMyInstitutions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit join request');
    } finally {
      setJoiningInstId(null);
    }
  };

  // Handle Copy Code
  const handleCopyCode = async () => {
    if (!selectedInstitution?.code) return;
    const success = await copyToClipboard(selectedInstitution.code);
    if (success) {
      setIsCopied(true);
      toast.success(`Copied invite code: ${selectedInstitution.code}`);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Accept Request
  const handleAccept = async (userId: string) => {
    if (!selectedInstitution) return;
    try {
      setActionLoadingId(userId);
      await institutionsApi.acceptRequest(selectedInstitution.id, userId);
      toast.success('Member accepted into institution');
      await loadInstitutionDetails(selectedInstitution.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Request
  const handleReject = async (userId: string) => {
    if (!selectedInstitution) return;
    try {
      setActionLoadingId(userId);
      await institutionsApi.rejectRequest(selectedInstitution.id, userId);
      toast.info('Join request rejected');
      await loadInstitutionDetails(selectedInstitution.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const isStudentUser = user?.role === 'STUDENT' || currentMembership?.role === 'STUDENT';
  const isOwner =
    Boolean(selectedInstitution?.ownerId && user?.id && selectedInstitution.ownerId === user.id) ||
    Boolean(selectedInstitution?.owner?.id && user?.id && selectedInstitution.owner.id === user.id) ||
    currentMembership?.role === 'OWNER';

  const isAdmin = currentMembership?.role === 'ADMIN';

  // Elevated management: Only Owner and Admin
  const isOwnerOrAdmin = isOwner || isAdmin;

  // Edit details is ONLY for Owner or Admin (Teachers cannot edit institution details)
  const canEditInstitution = isOwner || isAdmin;

  // View members directory: Owner, Admin, and Teachers
  const canViewMembers = isOwnerOrAdmin || (!isStudentUser && (user?.role === 'TEACHER' || user?.role === 'HOST'));

  const canLeave = !isOwner && Boolean(currentMembership && currentMembership.status !== 'LEFT');

  // Appoint or remove Admin role (OWNER ONLY, only teachers can be admin)
  const handleToggleAdmin = async (targetUserId: string, makeAdmin: boolean) => {
    if (!selectedInstitution || !isOwner) return;
    try {
      setActionLoadingId(targetUserId);
      await institutionsApi.setAdminRole(selectedInstitution.id, targetUserId, makeAdmin);
      toast.success(makeAdmin ? 'Member appointed as Administrator' : 'Administrator role removed');
      await loadInstitutionDetails(selectedInstitution.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update administrator role');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remove member (OWNER or ADMIN)
  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!selectedInstitution || !isOwnerOrAdmin) return;
    if (
      !window.confirm(
        `Are you sure you want to remove "${memberName}" from ${selectedInstitution.name}?`
      )
    ) {
      return;
    }
    try {
      setActionLoadingId(targetUserId);
      await institutionsApi.removeMember(selectedInstitution.id, targetUserId);
      toast.success(`Removed "${memberName}" from institution`);
      await loadInstitutionDetails(selectedInstitution.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Eligible instructors for ownership transfer
  const eligibleTeachersForTransfer = useMemo(() => {
    return members.filter((m) => {
      const targetUserId = m.userId || m.user?.id || (m as any).id;
      const isNotSelf = targetUserId !== user?.id && targetUserId !== selectedInstitution?.ownerId;
      const isTeacherOrAdmin = m.role === 'TEACHER' || m.role === 'ADMIN';
      return isNotSelf && isTeacherOrAdmin;
    });
  }, [members, user?.id, selectedInstitution?.ownerId]);

  // Leave Institution (for non-owner teachers and students)
  const handleLeaveInstitution = async () => {
    if (!selectedInstitution) return;
    if (
      !window.confirm(
        `Are you sure you want to leave "${selectedInstitution.name}"? You will lose access to its institutional classrooms and resources.`
      )
    ) {
      return;
    }

    try {
      setIsLoadingDetails(true);
      await institutionsApi.leave(selectedInstitution.id);
      toast.success(`You have left ${selectedInstitution.name}`);
      setSelectedInstitution(null);
      setCurrentMembership(null);
      await fetchMyInstitutions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave institution');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Delete Institution (OWNER ONLY)
  const handleDeleteInstitution = async () => {
    if (!selectedInstitution) return;
    if (!isOwner) {
      toast.error('Only the institution owner can delete this institution');
      return;
    }

    const confirmName = window.prompt(
      `DANGER: Deleting "${selectedInstitution.name}" is permanent and cannot be undone.\n\nAll institutional memberships and classrooms will be unlinked.\n\nTo confirm permanent deletion, please type the institution name exactly: "${selectedInstitution.name}"`
    );

    if (confirmName === null) return;
    if (confirmName.trim() !== selectedInstitution.name.trim()) {
      toast.error('Institution name did not match. Deletion cancelled.');
      return;
    }

    try {
      setIsLoading(true);
      await institutionsApi.delete(selectedInstitution.id);
      toast.success(`Institution "${selectedInstitution.name}" deleted successfully`);
      setSelectedInstitution(null);
      setCurrentMembership(null);
      await fetchMyInstitutions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete institution');
    } finally {
      setIsLoading(false);
    }
  };

  // Enforce students land on About & Contact or Classrooms only
  useEffect(() => {
    if (isStudentUser && (activeTab === 'requests' || activeTab === 'members')) {
      setActiveTab('about');
    }
  }, [isStudentUser, activeTab]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestRoleFilter === 'ALL') return true;
      return r.role === requestRoleFilter;
    });
  }, [requests, requestRoleFilter]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.name || (m as any).name || '';
      const email = m.user?.email || (m as any).email || '';
      const query = memberSearch.toLowerCase();
      const matchesSearch = !query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
      const matchesRole = memberRoleFilter === 'ALL' || m.role === memberRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, memberSearch, memberRoleFilter]);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/70">
        <div className="flex items-center space-x-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Back to Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Institution Management
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage member join requests, instructors, students, and institutional settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'STUDENT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-medium"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-primary" />
              New Institution
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsJoinOpen(true)}
            className="text-xs font-medium"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Join Institution
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchMyInstitutions();
              if (selectedInstitution) loadInstitutionDetails(selectedInstitution.id);
            }}
            className="h-8 w-8"
            title="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDetails ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <span>Loading institutions...</span>
        </div>
      ) : myInstitutions.length === 0 ? (
        <div className="space-y-8">
          <Card className="border border-dashed border-border/80 p-8 sm:p-12 text-center bg-card">
            <Building2 className="mx-auto h-12 w-12 text-primary/70 mb-3" />
            <h3 className="text-xl font-bold text-foreground">No Institutions Linked Yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mt-2 mb-6 leading-relaxed">
              You are not currently affiliated with any educational institution. Educational institutions let you collaborate with teachers and students, manage classrooms, and process join requests.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {user?.role !== 'STUDENT' && (
                <Button onClick={() => setIsCreateOpen(true)} size="sm">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Create Institution
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsJoinOpen(true)} size="sm">
                <Users className="mr-1.5 h-4 w-4" />
                Join via Code
              </Button>
            </div>
          </Card>

          {/* Explore Public Institutions Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Discover & Join Institutions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Browse verified institutions or search by name or unique code
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search institutions..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInstitutions(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2 text-primary" />
                Searching institutions...
              </div>
            ) : searchResults.length === 0 ? (
              <Card className="p-8 text-center border-border/60 bg-muted/20">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? `No institutions found matching "${searchQuery}"`
                    : 'No public institutions found. You can create one or join with an invite code.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((pubInst) => (
                  <div
                    key={pubInst.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {pubInst.name}
                        </div>
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                          {pubInst.code}
                        </span>
                      </div>
                      {pubInst.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {pubInst.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">
                        Code: {pubInst.code}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleJoinById(pubInst.id, pubInst.name)}
                        disabled={joiningInstId === pubInst.id}
                        className="text-xs h-7 px-3 font-medium"
                      >
                        {joiningInstId === pubInst.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Users className="h-3 w-3 mr-1" />
                        )}
                        Request to Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Institution Selector List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Your Institutions ({myInstitutions.length})
            </h3>
            <div className="space-y-2">
              {myInstitutions.map((membership) => {
                const inst: Institution = membership.institution || {
                  id: membership.institutionId || membership.id,
                  name: (membership as any).name || 'Institution',
                  code: (membership as any).code || '',
                  status: 'ACTIVE',
                  ownerId: '',
                  createdAt: '',
                  updatedAt: '',
                };
                const isSelected = selectedInstitution?.id === inst.id;
                const isOwner = membership.role === 'OWNER';
                const isAdmin = membership.role === 'ADMIN';

                return (
                  <button
                    key={membership.id}
                    type="button"
                    onClick={() => handleSelectInstitution(inst, membership)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {inst.name}
                      </span>
                      <Badge
                        variant={isOwner || isAdmin ? 'default' : 'secondary'}
                        className="text-[9px] uppercase px-1.5 py-0 font-mono shrink-0"
                      >
                        {membership.role}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span className="font-mono text-[11px] text-primary">{inst.code}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase ${membership.status === 'ACCEPTED'
                          ? 'text-emerald-600 border-emerald-300'
                          : 'text-amber-600 border-amber-300'
                          }`}
                      >
                        {membership.status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Institution Workspace */}
          {selectedInstitution && (
            <div className="lg:col-span-3 space-y-6">
              {/* Institution Profile Banner */}
              <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedInstitution.name}
                      </h2>
                      <Badge
                        variant={isOwnerOrAdmin ? 'default' : 'secondary'}
                        className="text-[10px] uppercase font-mono"
                      >
                        Your Role: {currentMembership?.role}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase text-emerald-600 border-emerald-300">
                        {selectedInstitution.status}
                      </Badge>
                    </div>
                    {selectedInstitution.description && (
                      <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                        {selectedInstitution.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Code */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    {/* Code Card with Copy */}
                    <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                      <div className="text-left">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">
                          Invite Code
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-primary tracking-wide">
                          {selectedInstitution.code}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-7 px-1.5 text-xs"
                        title="Copy invite code"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>

                    {/* Edit Details (Owner or Admin ONLY) */}
                    {canEditInstitution && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditOpen(true)}
                        className="h-9 text-xs font-medium"
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                        Edit Details
                      </Button>
                    )}

                    {/* Leave Institution (Non-owner member, both Teacher & Student) */}
                    {canLeave && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLeaveInstitution}
                        className="h-9 text-xs font-medium text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                        Leave
                      </Button>
                    )}

                    {/* Delete Institution (OWNER ONLY) */}
                    {/* {isOwner && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteInstitution}
                        className="h-9 text-xs font-medium"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )} */}
                  </div>
                </div>

                {/* Stats Summary Bar (Staff & Admins Only) */}
                {isOwnerOrAdmin && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border divide-x divide-border bg-muted/20">
                    <div className="p-3 text-center">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground block">Members</span>
                      <span className="text-base font-bold text-foreground">
                        {stats?.totalMembers ?? members.length}
                      </span>
                    </div>
                    <div className="p-3 text-center">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground block">Teachers</span>
                      <span className="text-base font-bold text-primary">
                        {stats?.totalTeachers ?? members.filter((m) => m.role === 'TEACHER' || m.role === 'OWNER').length}
                      </span>
                    </div>
                    <div className="p-3 text-center">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground block">Students</span>
                      <span className="text-base font-bold text-blue-600">
                        {stats?.totalStudents ?? members.filter((m) => m.role === 'STUDENT').length}
                      </span>
                    </div>
                    <div className="p-3 text-center">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground block">Pending Requests</span>
                      <span className={`text-base font-bold ${requests.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                        {stats?.pendingRequests ?? requests.length}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Tabs Navigation */}
              <div className="flex items-center space-x-1 border-b border-border/80">
                {/* Join Requests: Owner & Admin only */}
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'requests'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Join Requests</span>
                    {requests.length > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px]">
                        {requests.length}
                      </Badge>
                    )}
                  </button>
                )}

                {/* Members Directory: Owner, Admin, and Teachers */}
                {canViewMembers && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'members'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Members Directory ({members.length})</span>
                  </button>
                )}

                {/* About & Contact Tab (Always visible, default for students) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('about')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'about'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>About & Contact</span>
                </button>

                {/* Classrooms Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('classrooms')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'classrooms'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {isStudentUser ? 'Classrooms You Joined' : `Classrooms (${classrooms.length})`}
                  </span>
                </button>
              </div>

              {/* TAB 1: PENDING REQUESTS (Staff/Admin Only) */}
              {isOwnerOrAdmin && activeTab === 'requests' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Pending Membership Requests
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Approve or decline requests from teachers and students wishing to join
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={requestRoleFilter === 'ALL' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setRequestRoleFilter('ALL')}
                        className="text-xs h-7 px-2.5"
                      >
                        All ({requests.length})
                      </Button>
                      <Button
                        variant={requestRoleFilter === 'TEACHER' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setRequestRoleFilter('TEACHER')}
                        className="text-xs h-7 px-2.5"
                      >
                        Teachers
                      </Button>
                      <Button
                        variant={requestRoleFilter === 'STUDENT' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setRequestRoleFilter('STUDENT')}
                        className="text-xs h-7 px-2.5"
                      >
                        Students
                      </Button>
                    </div>
                  </div>

                  {!isOwnerOrAdmin ? (
                    <Card className="border border-border/80 p-8 text-center bg-card">
                      <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-foreground">Administrator Access Required</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Only institution owners and administrators can approve or reject join requests.
                      </p>
                    </Card>
                  ) : filteredRequests.length === 0 ? (
                    <Card className="border border-dashed border-border/80 p-10 text-center bg-card">
                      <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-foreground">No Pending Requests</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All incoming student and teacher join requests have been processed.
                      </p>
                    </Card>
                  ) : (
                    <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-card">
                      {filteredRequests.map((req) => {
                        const targetUser = req.user;
                        const isTeacher = req.role === 'TEACHER';
                        const isActing = actionLoadingId === req.userId;

                        return (
                          <div
                            key={req.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Avatar
                                name={targetUser?.name || 'Applicant'}
                                src={targetUser?.avatar || undefined}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {targetUser?.name || 'Unknown User'}
                                  </span>
                                  <Badge
                                    variant={isTeacher ? 'default' : 'secondary'}
                                    className="text-[9px] uppercase px-1.5 py-0"
                                  >
                                    Requested: {req.role}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground block truncate">
                                  {targetUser?.email}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  Requested on {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(req.userId)}
                                disabled={isActing}
                                className="text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                              >
                                <UserX className="mr-1.5 h-3.5 w-3.5" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAccept(req.userId)}
                                disabled={isActing}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MEMBERS DIRECTORY (Staff & Admins) */}
              {canViewMembers && activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search members by name or email..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={memberRoleFilter === 'ALL' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMemberRoleFilter('ALL')}
                        className="text-xs h-7 px-2.5"
                      >
                        All ({members.length})
                      </Button>
                      <Button
                        variant={memberRoleFilter === 'TEACHER' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMemberRoleFilter('TEACHER')}
                        className="text-xs h-7 px-2.5"
                      >
                        Teachers
                      </Button>
                      <Button
                        variant={memberRoleFilter === 'STUDENT' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMemberRoleFilter('STUDENT')}
                        className="text-xs h-7 px-2.5"
                      >
                        Students
                      </Button>
                    </div>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <Card className="border border-dashed border-border/80 p-8 text-center bg-card">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-foreground">No Members Found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try changing your search term or role filter.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMembers.map((m) => {
                        const memberUser = m.user;
                        const isMemberOwner = m.role === 'OWNER';
                        const isMemberAdmin = m.role === 'ADMIN';
                        const isMemberTeacher = m.role === 'TEACHER';
                        const memberUserId = m.userId || m.user?.id || (m as any).id;
                        const isSelf = memberUserId === user?.id;

                        // Can the current user remove this member?
                        // - Owner can remove anyone except themselves
                        // - Admin can remove teachers and students (not owner, not self, not other admins)
                        const canRemove =
                          !isSelf &&
                          !isMemberOwner &&
                          (isOwner || (isAdmin && !isMemberAdmin));

                        // Can the current user toggle Admin role?
                        // - Owner ONLY can appoint or remove admin, and only for teachers/admins
                        const canToggleAdmin =
                          isOwner && !isSelf && (isMemberTeacher || isMemberAdmin);

                        return (
                          <div
                            key={m.id || memberUserId}
                            className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col justify-between gap-3 hover:border-primary/30 transition-all shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar
                                  name={memberUser?.name || 'Member'}
                                  src={memberUser?.avatar || undefined}
                                  size="md"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                      {memberUser?.name || 'Member'}
                                    </span>
                                    {isSelf && (
                                      <Badge variant="outline" className="text-[8px] font-mono px-1 py-0">
                                        You
                                      </Badge>
                                    )}
                                    {isMemberOwner && (
                                      <Badge variant="default" className="text-[8px] uppercase px-1 py-0 font-mono">
                                        Owner
                                      </Badge>
                                    )}
                                    {isMemberAdmin && !isMemberOwner && (
                                      <Badge variant="secondary" className="text-[8px] uppercase px-1 py-0 font-mono bg-primary/10 text-primary">
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground truncate block">
                                    {memberUser?.email}
                                  </span>
                                </div>
                              </div>

                              <Badge
                                variant={isMemberOwner || isMemberAdmin ? 'default' : isMemberTeacher ? 'secondary' : 'outline'}
                                className="text-[9px] uppercase font-mono shrink-0 ml-2"
                              >
                                {m.role}
                              </Badge>
                            </div>

                            {/* Actions for Owner and Admin */}
                            {(canToggleAdmin || canRemove) && (
                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
                                {canToggleAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleAdmin(memberUserId, !isMemberAdmin)}
                                    disabled={actionLoadingId === memberUserId}
                                    className="text-[11px] h-7 px-2 font-medium"
                                  >
                                    {actionLoadingId === memberUserId ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
                                    )}
                                    {isMemberAdmin ? 'Remove Admin' : 'Make Admin'}
                                  </Button>
                                )}

                                {canRemove && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(memberUserId, memberUser?.name || 'Member')}
                                    disabled={actionLoadingId === memberUserId}
                                    className="text-[11px] h-7 px-2 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    {actionLoadingId === memberUserId ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <UserX className="h-3 w-3 mr-1" />
                                    )}
                                    Remove
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CLASSROOMS */}
              {activeTab === 'classrooms' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {isStudentUser ? 'Classrooms You Joined' : 'Institutional Classrooms'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isStudentUser
                          ? `Live and active classes in ${selectedInstitution.name} that you can attend`
                          : `Live sessions and classes affiliated with ${selectedInstitution.name}`}
                      </p>
                    </div>

                    {!isStudentUser && (
                      <Link to="/create-classroom">
                        <Button size="sm" className="text-xs">
                          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                          New Classroom
                        </Button>
                      </Link>
                    )}
                  </div>

                  {classrooms.length === 0 ? (
                    <Card className="border border-dashed border-border/80 p-8 text-center bg-card">
                      <Presentation className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {isStudentUser ? 'No Classrooms Available Yet' : 'No Classrooms Created Yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isStudentUser
                          ? 'When instructors in this institution launch classes, you will be able to enter and attend them here.'
                          : 'Instructors in this institution can create classes that will appear here.'}
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {classrooms.map((room) => {
                        const isEnded = room.status === 'ENDED';
                        return (
                          <div
                            key={room.code || room.id}
                            className="p-4 rounded-xl border border-border/80 bg-card flex flex-col justify-between hover:border-primary/40 transition-all shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm text-foreground truncate">
                                  {room.name}
                                </span>
                                <Badge
                                  variant={isEnded ? 'secondary' : 'default'}
                                  className={`text-[9px] uppercase ${isEnded
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                    }`}
                                >
                                  {isEnded ? 'Ended' : 'Active'}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                <span>Code:</span>
                                <span className="font-mono font-semibold text-primary">{room.code}</span>
                              </div>
                            </div>

                            {isEnded ? (
                              <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                                Classroom Ended
                              </Button>
                            ) : (
                              <Link to={`/classroom/${room.code}`} className="w-full">
                                <Button size="sm" className="w-full text-xs font-medium">
                                  <span>Enter Classroom</span>
                                </Button>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ABOUT & CONTACT */}
              {activeTab === 'about' && (
                <Card className="border border-border/80 bg-card p-6 space-y-6">
                  {/* Header & Description */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-foreground">
                        About {selectedInstitution.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {canEditInstitution && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditOpen(true)}
                            className="h-8 text-xs font-medium"
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                            Edit Details
                          </Button>
                        )}
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                          {selectedInstitution.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono font-semibold">
                          Your Role: {currentMembership?.role || 'STUDENT'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {selectedInstitution.description || 'No detailed description provided by this institution.'}
                    </p>
                  </div>

                  {/* Highlights Grid: Code & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wide block">
                          Institution Invite Code
                        </span>
                        <span className="font-mono text-base font-bold text-foreground tracking-wider">
                          {selectedInstitution.code}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-8 text-xs font-medium bg-background"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide block">
                          Your Affiliated Role
                        </span>
                        <span className="text-base font-bold text-foreground capitalize">
                          {currentMembership?.role?.toLowerCase() || 'Student'}
                        </span>
                      </div>
                      <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5">
                        {currentMembership?.role || 'STUDENT'}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Information Details */}
                  <div className="pt-2 border-t border-border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                            Contact Email
                          </span>
                          <span className="text-xs text-foreground font-medium">
                            {selectedInstitution.email || 'Not provided'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                            Phone Number
                          </span>
                          <span className="text-xs text-foreground font-medium">
                            {selectedInstitution.phone || 'Not provided'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                            Official Website
                          </span>
                          {selectedInstitution.website ? (
                            <a
                              href={selectedInstitution.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>{selectedInstitution.website}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-foreground font-medium">Not provided</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                            Campus Address
                          </span>
                          <span className="text-xs text-foreground font-medium">
                            {selectedInstitution.address || 'Not provided'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone: Transfer Ownership & Delete Institution (OWNER ONLY) */}
                  {isOwner && (
                    <div className="pt-4 border-t border-destructive/20 bg-destructive/5 rounded-xl p-4 mt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-destructive font-semibold text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Danger Zone: Institution Ownership</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                            Transfer institution ownership to another instructor or permanently delete this institution. Deleting dissolves all classroom affiliations and member records.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTransferOpen(true)}
                            className="text-xs font-medium border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                          >
                            Transfer Ownership
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteInstitution}
                            className="text-xs font-medium"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete Institution
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leave Institution Section (Non-owner member, both Teacher & Student) */}
                  {canLeave && (
                    <div className="pt-4 border-t border-border bg-muted/20 rounded-xl p-4 mt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="font-semibold text-sm text-foreground block">
                            Leave Institution
                          </span>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                            You are currently affiliated with {selectedInstitution.name} as a {currentMembership?.role?.toLowerCase() || 'member'}. Leaving will withdraw your membership and institutional access.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLeaveInstitution}
                          className="text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0 text-xs font-medium"
                        >
                          <LogOut className="mr-1.5 h-3.5 w-3.5" />
                          Leave Institution
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals for quick actions */}
      <CreateInstitutionDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchMyInstitutions}
      />
      <JoinInstitutionDialog
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={fetchMyInstitutions}
      />
      {selectedInstitution && (
        <EditInstitutionDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          institution={selectedInstitution}
          onSuccess={(updated) => {
            setSelectedInstitution((prev) => ({ ...(prev || {}), ...updated }));
            fetchMyInstitutions();
          }}
        />
      )}
      {selectedInstitution && (
        <TransferOwnershipDialog
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
          institution={selectedInstitution}
          eligibleTeachers={eligibleTeachersForTransfer}
          onSuccess={() => {
            fetchMyInstitutions();
            if (selectedInstitution) loadInstitutionDetails(selectedInstitution.id);
          }}
        />
      )}
    </div>
  );
};

export default InstitutionManagement;
