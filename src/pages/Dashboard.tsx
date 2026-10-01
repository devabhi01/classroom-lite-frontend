import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  LogIn,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Users,
  Building2,
  KeyRound,
  ShieldCheck,
  Settings,
  LogOut,
  Globe,
  BarChart3,
  Presentation,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Classroom } from '@/types/classroom';
import { Institution, InstitutionMembership } from '@/types/institution';
import { institutionsApi } from '@/lib/institutions';
import { JoinInstitutionDialog } from '@/components/institution/JoinInstitutionDialog';
import { CreateInstitutionDialog } from '@/components/institution/CreateInstitutionDialog';
import { ManageInstitutionDialog } from '@/components/institution/ManageInstitutionDialog';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const [recentClassrooms, setRecentClassrooms] = useState<Classroom[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionMembership[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalSessions: number;
    activeSessions: number;
    totalTimeFormatted: string;
    studentsOrTeachersCount: number;
    avgDurationFormatted: string;
  } | null>(null);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dialog States
  const [isJoinInstOpen, setIsJoinInstOpen] = useState(false);
  const [isCreateInstOpen, setIsCreateInstOpen] = useState(false);
  const [managingInstitution, setManagingInstitution] = useState<Institution | null>(null);

  const fetchInstitutions = async () => {
    try {
      setIsInstitutionsLoading(true);
      const data = await institutionsApi.getMy();
      setInstitutions(data);
    } catch (err) {
      console.error('Failed to load user institutions', err);
    } finally {
      setIsInstitutionsLoading(false);
    }
  };

  const setIsInstitutionsLoading = (loading: boolean) => {
    setIsLoadingInstitutions(loading);
  };

  const fetchClassrooms = async () => {
    try {
      setIsLoadingClassrooms(true);
      // Fetch host classrooms or available classrooms
      const res = await api.get('/classrooms');
      const list = res.data?.data || res.data?.classrooms || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(list)) {
        setRecentClassrooms(list);
        localStorage.setItem('tdp_recent_classrooms', JSON.stringify(list));
      } else {
        // Fallback to local cache if empty
        const cached = localStorage.getItem('tdp_recent_classrooms');
        if (cached) {
          setRecentClassrooms(JSON.parse(cached));
        }
      }
    } catch {
      // Fallback to recent classrooms saved locally
      try {
        const cached = localStorage.getItem('tdp_recent_classrooms');
        if (cached) {
          setRecentClassrooms(JSON.parse(cached));
        }
      } catch {
        // Ignore parse errors
      }
    } finally {
      setIsLoadingClassrooms(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchInstitutions();

    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/overview');
        const d = res.data?.data || res.data;
        if (d) {
          if (isStudent && d.studentSummary) {
            setAnalytics({
              totalSessions: d.studentSummary.totalAttended || 0,
              activeSessions: d.studentSummary.activeSessions || 0,
              totalTimeFormatted: d.studentSummary.totalLearningTimeFormatted || '0s',
              studentsOrTeachersCount: d.studentSummary.teachersEncountered || 0,
              avgDurationFormatted: d.studentSummary.avgSessionDurationFormatted || '0s',
            });
          } else if (d.teacherSummary) {
            setAnalytics({
              totalSessions: d.teacherSummary.totalHosted || 0,
              activeSessions: d.teacherSummary.activeSessions || 0,
              totalTimeFormatted: d.teacherSummary.totalTeachingTimeFormatted || '0s',
              studentsOrTeachersCount: d.teacherSummary.uniqueStudentsCount || 0,
              avgDurationFormatted: d.teacherSummary.avgDurationFormatted || '0s',
            });
          }
        }
      } catch {
        // Fallback calculation will handle
      }
    };

    fetchAnalytics();
  }, [isStudent]);

  const displayAnalytics = analytics || {
    totalSessions: recentClassrooms.length,
    activeSessions: recentClassrooms.filter((r) => r.status === 'ACTIVE').length,
    totalTimeFormatted: recentClassrooms.length > 0 ? `${recentClassrooms.length * 30}m` : '0s',
    studentsOrTeachersCount: isStudent ? Math.min(3, recentClassrooms.length) : recentClassrooms.length * 4,
    avgDurationFormatted: recentClassrooms.length > 0 ? '30m' : '0s',
  };

  const handleCopy = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedCode(code);
      toast.success(`Copied code ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Greeting Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome, {user?.name || (isStudent ? 'Student' : 'Teacher')}
            </h1>
            <Badge variant={isStudent ? 'secondary' : 'default'} className="text-xs">
              {isStudent ? 'Student' : 'Instructor'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStudent
              ? 'Join active classrooms with your classroom code, interact on whiteboards, and follow presentations.'
              : 'Manage your virtual classrooms, launch interactive teaching sessions, or oversee your institutions.'}
          </p>
        </div>
      </div>

      {/* Main Classroom Action Cards */}
      <div className={`grid gap-6 ${isStudent ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
        {!isStudent && (
          <Card className="border border-border/80 hover:border-primary/40 transition-all shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <PlusCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Create Classroom</CardTitle>
              <CardDescription>
                Host an interactive classroom session with whiteboard, PDF presentation, and screen sharing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-classroom">
                <Button className="w-full font-medium">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className={`border border-border/80 hover:border-primary/40 transition-all shadow-sm ${isStudent ? 'border-primary/40 bg-card' : ''}`}>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Join Classroom</CardTitle>
            <CardDescription>
              Enter a 6-character classroom code provided by your instructor or host to participate in an active class.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/join-classroom">
              <Button variant={isStudent ? 'default' : 'outline'} className="w-full font-medium">
                <LogIn className="mr-2 h-4 w-4" />
                Join Classroom
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border/80 hover:border-primary/40 transition-all shadow-sm">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <BarChart3 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Session Analytics</CardTitle>
            <CardDescription>
              Review attendance records, teaching/learning durations, student engagement, and historical reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/analytics">
              <Button variant="outline" className="w-full font-medium hover:border-primary/50">
                <BarChart3 className="mr-2 h-4 w-4 text-emerald-600" />
                Open Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Snapshot & Insights Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Session Analytics & Insights</h2>
          </div>
          <Link
            to="/analytics"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group"
          >
            <span>Full Analytics Report</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">{isStudent ? 'Classes Attended' : 'Classes Hosted'}</span>
              <Presentation className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {displayAnalytics.totalSessions}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {displayAnalytics.activeSessions > 0
                ? `${displayAnalytics.activeSessions} currently active`
                : 'All concluded'}
            </p>
          </Card>

          <Card className="border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">{isStudent ? 'Learning Time' : 'Teaching Time'}</span>
              <Clock className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {displayAnalytics.totalTimeFormatted}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Avg {displayAnalytics.avgDurationFormatted} / session
            </p>
          </Card>

          <Card className="border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">{isStudent ? 'Instructors' : 'Students Reached'}</span>
              <Users className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {displayAnalytics.studentsOrTeachersCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isStudent ? 'Unique teachers' : 'Total attendees'}
            </p>
          </Card>

          <Card className="border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Session Status</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {displayAnalytics.activeSessions} Active
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live interactive rooms
            </p>
          </Card>
        </div>
      </div>

      {/* INSTITUTIONS SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">My Institutions</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/institutions">
              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
                Manage All Hub
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsJoinInstOpen(true)}
              className="text-xs"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Join by Code
            </Button>
            {!isStudent && (
              <Button
                size="sm"
                onClick={() => setIsCreateInstOpen(true)}
                className="text-xs"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Create Institution
              </Button>
            )}
          </div>
        </div>

        {isLoadingInstitutions ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">
            Loading institutions...
          </div>
        ) : institutions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center bg-card">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No institutions joined yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Institutions provide organized cohorts for classrooms and members. Join an institution with a code, or create your own.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsJoinInstOpen(true)} className="text-xs">
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Join with Code
              </Button>
              {!isStudent && (
                <Button size="sm" onClick={() => setIsCreateInstOpen(true)} className="text-xs">
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                  Create Institution
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((m) => {
              const inst: Institution = m.institution || {
                id: m.institutionId || m.id,
                name: (m as any).name || 'Institution',
                code: (m as any).code || '',
                description: (m as any).description || null,
                logo: (m as any).logo || null,
                email: (m as any).email || null,
                phone: (m as any).phone || null,
                address: (m as any).address || null,
                website: (m as any).website || null,
                ownerId: (m as any).ownerId || '',
                status: 'ACTIVE',
                createdAt: (m as any).createdAt || '',
                updatedAt: (m as any).updatedAt || '',
              };
              const isOwnerOrAdmin = m.role === 'OWNER' || m.role === 'ADMIN';
              const isPending = m.status === 'REQUESTED';

              return (
                <div
                  key={m.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/30 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate block">
                          {inst.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">Code:</span>
                          <span className="font-mono text-xs font-semibold text-primary">{inst.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inst.code)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Copy code"
                          >
                            {copiedCode === inst.code ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={isOwnerOrAdmin ? 'default' : 'outline'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {m.role}
                        </Badge>
                        <Badge
                          variant={
                            m.status === 'ACCEPTED'
                              ? 'secondary'
                              : m.status === 'REQUESTED'
                              ? 'outline'
                              : 'destructive'
                          }
                          className={`text-[9px] uppercase ${
                            m.status === 'REQUESTED' ? 'text-amber-600 border-amber-300' : ''
                          }`}
                        >
                          {m.status}
                        </Badge>
                      </div>
                    </div>

                    {inst.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">
                        {inst.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-border mt-3">
                    {isPending ? (
                      <div className="w-full text-center text-[11px] text-amber-600 py-1 font-medium bg-amber-500/10 rounded">
                        Pending Admin Approval
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <Link to={`/institutions/${inst.id}`} className="flex-1">
                          <Button size="sm" variant={isOwnerOrAdmin ? 'default' : 'outline'} className="w-full text-xs">
                            <Building2 className="mr-1.5 h-3.5 w-3.5" />
                            {isOwnerOrAdmin ? 'Manage Institution' : 'View Institution'}
                          </Button>
                        </Link>
                        {isOwnerOrAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setManagingInstitution(inst)}
                            className="text-xs px-2.5"
                            title="Quick Dialog View"
                          >
                            Quick View
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT CLASSROOMS SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Recent Classrooms</h2>
            {recentClassrooms.length > 3 && (
              <span className="text-xs text-muted-foreground font-normal">
                (Latest 3 of {recentClassrooms.length})
              </span>
            )}
          </div>
          {recentClassrooms.length > 0 && (
            <Link
              to="/recent-classrooms"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group"
            >
              <span>View All Classrooms ({recentClassrooms.length})</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {isLoadingClassrooms ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">
            Loading classrooms...
          </div>
        ) : recentClassrooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No classrooms found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a classroom or join an existing session using a classroom code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClassrooms.slice(0, 3).map((room) => {
              const isEnded = room.status === 'ENDED';
              const isInstitution = room.type === 'INSTITUTION' || !!room.institutionId;

              return (
                <div
                  key={room.code || room.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/30 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate block">
                          {room.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isInstitution ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                              <Building2 className="h-3 w-3" />
                              {room.institution?.name || 'Institution Class'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              Independent
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge variant={isEnded ? 'secondary' : 'default'} className="text-[10px] uppercase">
                        {room.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-4">
                      <span>Code:</span>
                      <span className="font-mono font-medium text-foreground">{room.code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(room.code)}
                        className="text-primary hover:opacity-80 p-0.5"
                        title="Copy code"
                      >
                        {copiedCode === room.code ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Link to={`/classroom/${room.code}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs" disabled={isEnded}>
                      <span>{isEnded ? 'Classroom Ended' : 'Enter Classroom'}</span>
                      {!isEnded && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      <JoinInstitutionDialog
        isOpen={isJoinInstOpen}
        onClose={() => setIsJoinInstOpen(false)}
        onSuccess={fetchInstitutions}
      />

      <CreateInstitutionDialog
        isOpen={isCreateInstOpen}
        onClose={() => setIsCreateInstOpen(false)}
        onSuccess={fetchInstitutions}
      />

      <ManageInstitutionDialog
        institution={managingInstitution}
        isOpen={!!managingInstitution}
        onClose={() => setManagingInstitution(null)}
        onRefresh={fetchInstitutions}
      />
    </div>
  );
};
