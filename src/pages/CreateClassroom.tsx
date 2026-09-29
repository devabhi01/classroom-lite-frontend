import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Classroom } from '@/types/classroom';
import { useAuth } from '@/hooks/useAuth';

export const CreateClassroom: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the classroom');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const res = await api.post('/classrooms', { name: name.trim() });
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
      const isServerOffline = err.message?.toLowerCase().includes('connect') || err.message?.toLowerCase().includes('server');
      if (isServerOffline) {
        // Fallback: create classroom in local demo mode so user can test the UI immediately
        const fallbackRoom: Classroom = {
          id: 'demo_' + Date.now(),
          name: name.trim(),
          code: 'TDP' + Math.random().toString(36).substring(2, 5).toUpperCase(),
          hostId: 'demo_host_101',
          status: 'ACTIVE',
        };
        setCreatedRoom(fallbackRoom);
        toast.info('Backend server is offline. Classroom created in Standalone Demo Mode.');
        return;
      }
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
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
                <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline text-center">
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
                  {isCopied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
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
