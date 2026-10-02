import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowRight, Copy, Check, Sparkles, Building2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Classroom } from '@/types/classroom';
import { useAuth } from '@/hooks/useAuth';
import { institutionsApi } from '@/lib/institutions';
import { InstitutionMembership } from '@/types/institution';

export const CreateClassroom: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<'INDEPENDENT' | 'INSTITUTION'>('INDEPENDENT');
  const [institutionId, setInstitutionId] = useState<string>('');
  const [userInstitutions, setUserInstitutions] = useState<InstitutionMembership[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Classroom | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      toast.warning('Students cannot create classrooms. Please join using an instructor code.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoadingInstitutions(true);
        const memberships = await institutionsApi.getMy();
        // Only institutions where user has accepted membership and teacher/owner/admin role
        const valid = memberships.filter(
          (m) =>
            m.status === 'ACCEPTED' &&
            ['OWNER', 'ADMIN', 'TEACHER'].includes(m.role) &&
            m.institution
        );
        setUserInstitutions(valid);
        if (valid.length > 0 && valid[0].institution) {
          setInstitutionId(valid[0].institution.id);
        }
      } catch (err) {
        console.error('Failed to load user institutions', err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the classroom');
      return;
    }

    if (type === 'INSTITUTION' && !institutionId) {
      setError('Please select an institution for this classroom');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const payload: { name: string; type: 'INDEPENDENT' | 'INSTITUTION'; institutionId?: string } = {
        name: name.trim(),
        type,
      };

      if (type === 'INSTITUTION') {
        payload.institutionId = institutionId;
      }

      const res = await api.post('/classrooms', payload);
      const room: Classroom = res.data.data || res.data.classroom || res.data;

      setCreatedRoom(room);
      toast.success(`Classroom "${room.name}" created successfully!`);

      // Store in local storage cache for quick dashboard access
      try {
        const stored = localStorage.getItem('tdp_recent_classrooms');
        const list: Classroom[] = stored ? JSON.parse(stored) : [];
        const updated = [room, ...list.filter((r) => r.code !== room.code)].slice(0, 10);
        localStorage.setItem('tdp_recent_classrooms', JSON.stringify(updated));
      } catch {
        // Ignore cache storage error
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create classroom. Please try again.');
      toast.error(err.message || 'Failed to create classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdRoom) return;
    const success = await copyToClipboard(createdRoom.code);
    if (success) {
      setIsCopied(true);
      toast.success(`Classroom code ${createdRoom.code} copied!`);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!createdRoom ? (
          <Card className="border border-border/80 shadow-md">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <PlusCircle className="h-5 w-5" />
              </div>
              <CardTitle>Create New Classroom</CardTitle>
              <CardDescription>
                Set up an interactive space for your students to collaborate in real-time.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <Input
                  label="Classroom Name"
                  placeholder="e.g. Web Development 101"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  error={error}
                  autoFocus
                  required
                />

                {/* Scope: Independent vs Institution */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-foreground">Classroom Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('INDEPENDENT')}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                        type === 'INDEPENDENT'
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Globe className="h-3.5 w-3.5" />
                        <span>Independent</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Any student with code can join
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={userInstitutions.length === 0}
                      onClick={() => setType('INSTITUTION')}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                        type === 'INSTITUTION'
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : userInstitutions.length === 0
                          ? 'opacity-50 cursor-not-allowed border-input bg-muted/40 text-muted-foreground'
                          : 'border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Institution</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Scoped to institution members
                      </span>
                    </button>
                  </div>

                  {userInstitutions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      You are not currently an approved teacher or owner of any institution. Independent mode is active.
                    </p>
                  )}
                </div>

                {/* Institution Selector */}
                {type === 'INSTITUTION' && userInstitutions.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <label className="block text-xs font-medium text-foreground">
                      Select Institution
                    </label>
                    <select
                      value={institutionId}
                      onChange={(e) => setInstitutionId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {userInstitutions.map((m) => (
                        <option key={m.institution?.id} value={m.institution?.id}>
                          {m.institution?.name} ({m.institution?.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Only students accepted into this institution can join this classroom.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
                <Link
                  to="/dashboard"
                  className="text-xs text-muted-foreground hover:underline text-center"
                >
                  Cancel and back to Dashboard
                </Link>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="border-2 border-primary/30 shadow-lg text-center bg-card animate-in fade-in zoom-in-95">
            <CardHeader className="pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Classroom Created!</CardTitle>
              <CardDescription>{createdRoom.name}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              <div className="rounded-xl border border-border bg-muted/50 p-6 space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Classroom Code:
                </span>
                <div className="text-3xl font-extrabold font-mono tracking-widest text-primary">
                  {createdRoom.code}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Share this 6-character code with students to let them request to join.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyCode}
                  aria-label="Copy Classroom Code"
                >
                  {isCopied ? (
                    <Check className="mr-2 h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  <span>{isCopied ? 'Code Copied!' : 'Copy Code'}</span>
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => navigate(`/classroom/${createdRoom.code}`)}
                  aria-label="Enter Classroom"
                >
                  <span>Enter Classroom</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>

            <CardFooter className="justify-center border-t border-border pt-4">
              <button
                onClick={() => {
                  setCreatedRoom(null);
                  setName('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Create another classroom
              </button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};
